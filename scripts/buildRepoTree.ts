/**
 * Treeify — hierarchy analysis script
 * ===================================
 *
 * Point-in-time SNAPSHOT of a Prismic repository's Content Relationship graph.
 *
 * What it does:
 *   1. Fetches EVERY document via the Content API (`dangerouslyGetAll`).
 *   2. Deep-walks each document's `data` (top-level fields, group items, and
 *      slice primary/items) and records every Content Relationship / document
 *      link it finds as an edge parent→child, tagged with the field PATH the
 *      link came through.
 *   3. Builds a parent/child graph, roots it at the "Master Config" document,
 *      and assigns each node a level via shortest path from the root (BFS).
 *   4. Handles real-world shapes: a document linked from multiple parents
 *      (it's a graph, not a strict tree — all parents are listed) and cycles
 *      (the walk is guarded and never loops forever).
 *   5. Writes artifacts/repoTree.json.
 *
 * Generic + config-driven: repository name and read token come from the
 * environment (see lib/config.ts). Nothing here is specific to the demo model —
 * it walks whatever fields exist and finds whatever document links exist.
 *
 * Caveats (see README): this only captures relationships expressed as
 * link/relationship FIELDS — not links hardcoded in the frontend or embedded
 * inside rich text. Shared/reused documents appear under every parent.
 */
import * as prismic from "@prismicio/client";
import fs from "fs/promises";
import path from "path";
import { getRepositoryName, getReadToken, getEditorBaseUrl } from "../lib/config";

/** The document type (and title) we root the hierarchy from. */
const ROOT_TYPE = process.env.TREEIFY_ROOT_TYPE || "master_config";
const ROOT_TITLE_MATCH = /master\s*config/i;

// ── Types ───────────────────────────────────────────────────────────────────

interface Edge {
  from: string; // parent document id
  to: string; // child document id
  fieldPath: string; // where in the parent the link was found
  broken: boolean; // link points at a deleted/unpublished doc
}

interface ParentRef {
  id: string;
  fieldPath: string;
}

interface TreeNode {
  id: string;
  title: string;
  type: string;
  uid: string | null;
  level: number | null; // shortest distance from root; null = unreachable
  reachable: boolean;
  parents: ParentRef[]; // ALL parents (this is a graph, not a strict tree)
  children: ParentRef[]; // fieldPath is where the child link lives on THIS node
  path: string[]; // representative shortest path of ids from root → node
}

// ── Link detection ────────────────────────────────────────────────────────────

/**
 * Is this value a filled Content Relationship / document link?
 * In the Content API a document link is an object with link_type "Document"
 * and an id. Web/Media links and empty links are ignored.
 */
function asDocumentLink(
  value: unknown
): { id: string; broken: boolean } | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.link_type !== "Document") return null;
  if (typeof v.id !== "string" || v.id.length === 0) return null;
  return { id: v.id, broken: v.isBroken === true };
}

/**
 * Recursively walk any field value and collect every document link, recording
 * the path taken to reach it. We do NOT descend into a document link's own
 * `.data` (present when a relationship fetches fields) — those belong to the
 * linked document, not to this parent.
 */
function collectLinks(
  value: unknown,
  currentPath: string,
  out: { id: string; broken: boolean; fieldPath: string }[]
): void {
  const link = asDocumentLink(value);
  if (link) {
    out.push({ ...link, fieldPath: currentPath });
    return; // stop — don't recurse into fetched relationship data
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectLinks(item, `${currentPath}[${i}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      collectLinks(child, `${currentPath}.${key}`, out);
    }
  }
}

// ── Title derivation (generic) ───────────────────────────────────────────────

function deriveTitle(doc: prismic.PrismicDocument): string {
  const data = (doc.data ?? {}) as Record<string, unknown>;
  for (const key of ["title", "name", "label", "heading"]) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return doc.uid || doc.id;
}

/**
 * Detects a directed cycle anywhere in the graph using iterative DFS
 * 3-colouring. Iterative (not recursive) so a deep or wide repo can't blow the
 * stack. Returns true as soon as any back-edge to a node still on the DFS
 * stack (gray) is found.
 */
function detectCycle(adjacency: Map<string, string[]>, nodeIds: string[]): boolean {
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  for (const id of nodeIds) color.set(id, WHITE);

  for (const start of nodeIds) {
    if (color.get(start) !== WHITE) continue;
    const stack: { id: string; i: number }[] = [{ id: start, i: 0 }];
    color.set(start, GRAY);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const neighbours = adjacency.get(frame.id) ?? [];
      if (frame.i >= neighbours.length) {
        color.set(frame.id, BLACK);
        stack.pop();
        continue;
      }
      const next = neighbours[frame.i++];
      const c = color.get(next);
      if (c === GRAY) return true; // back-edge → cycle
      if (c === WHITE) {
        color.set(next, GRAY);
        stack.push({ id: next, i: 0 });
      }
    }
  }
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const repositoryName = getRepositoryName();
  const accessToken = getReadToken();
  console.log(`🌳 Treeify — analyzing "${repositoryName}"…`);

  const client = prismic.createClient(repositoryName, {
    accessToken,
    // Content relationships only need to return metadata (id/type), which is
    // the default. No routes/graphQuery required.
    fetchOptions: { cache: "no-store" },
  });

  const docs = await client.dangerouslyGetAll();
  console.log(`   fetched ${docs.length} documents`);

  const docById = new Map<string, prismic.PrismicDocument>();
  for (const d of docs) docById.set(d.id, d);

  // 1) Collect edges by deep-walking every document's data.
  const edges: Edge[] = [];
  for (const doc of docs) {
    const found: { id: string; broken: boolean; fieldPath: string }[] = [];
    collectLinks(doc.data, "data", found);
    for (const f of found) {
      // Only keep links that resolve to a document in the repo (or mark broken
      // links whose target we can't see — e.g. unpublished/deleted).
      const broken = f.broken || !docById.has(f.id);
      if (f.id === doc.id) {
        // self-link — keep it (visible as a 1-node cycle) but flag via edge
      }
      edges.push({ from: doc.id, to: f.id, fieldPath: f.fieldPath, broken });
    }
  }
  console.log(`   found ${edges.length} content-relationship edges`);

  // 2) Build node index from documents.
  const nodes = new Map<string, TreeNode>();
  for (const doc of docs) {
    nodes.set(doc.id, {
      id: doc.id,
      title: deriveTitle(doc),
      type: doc.type,
      uid: doc.uid ?? null,
      level: null,
      reachable: false,
      parents: [],
      children: [],
      path: [],
    });
  }
  // Ensure broken targets still appear as (broken) placeholder nodes.
  for (const e of edges) {
    if (!nodes.has(e.to)) {
      nodes.set(e.to, {
        id: e.to,
        title: "(missing / unpublished document)",
        type: "unknown",
        uid: null,
        level: null,
        reachable: false,
        parents: [],
        children: [],
        path: [],
      });
    }
  }

  // 3) Wire parents/children (dedupe identical parent/child+path pairs).
  const childKey = new Set<string>();
  const parentKey = new Set<string>();
  const adjacency = new Map<string, string[]>(); // for BFS
  for (const e of edges) {
    const parent = nodes.get(e.from)!;
    const child = nodes.get(e.to)!;

    const ck = `${e.from}->${e.to}:${e.fieldPath}`;
    if (!childKey.has(ck)) {
      parent.children.push({ id: e.to, fieldPath: e.fieldPath });
      childKey.add(ck);
    }
    const pk = `${e.to}<-${e.from}:${e.fieldPath}`;
    if (!parentKey.has(pk)) {
      child.parents.push({ id: e.from, fieldPath: e.fieldPath });
      parentKey.add(pk);
    }
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    adjacency.get(e.from)!.push(e.to);
  }

  // 4) Find the root: prefer the ROOT_TYPE document, else a title match.
  let root =
    docs.find((d) => d.type === ROOT_TYPE) ??
    docs.find((d) => ROOT_TITLE_MATCH.test(deriveTitle(d)));
  const rootId = root?.id ?? null;

  // 5) BFS from root → shortest-path levels + representative path. The
  //    `reachable` guard means every node is enqueued at most once, so the
  //    walk is cycle-proof (it never loops forever) and each node is leveled
  //    at its shortest depth from the root.
  if (rootId) {
    const rootNode = nodes.get(rootId)!;
    rootNode.level = 0;
    rootNode.reachable = true;
    rootNode.path = [rootId];
    const queue: string[] = [rootId];
    while (queue.length) {
      const currentId = queue.shift()!;
      const current = nodes.get(currentId)!;
      for (const childId of adjacency.get(currentId) ?? []) {
        const child = nodes.get(childId)!;
        if (!child.reachable) {
          child.reachable = true;
          child.level = (current.level ?? 0) + 1;
          child.path = [...current.path, childId];
          queue.push(childId);
        }
      }
    }
  }

  // Detect directed cycles anywhere in the graph via DFS 3-colouring
  // (white → gray → black). A gray→gray edge is a back-edge = a cycle. This
  // scans the whole graph, not just the BFS tree, so it catches cross-branch
  // cycles (e.g. two components that reference each other) that an
  // ancestor-only check would miss.
  const cyclic = detectCycle(adjacency, Array.from(nodes.keys()));

  // 6) Stats.
  const nodeList = Array.from(nodes.values());
  const stats = {
    documentCount: docs.length,
    nodeCount: nodeList.length,
    edgeCount: edges.length,
    maxLevel: nodeList.reduce((m, n) => Math.max(m, n.level ?? -1), 0),
    orphanCount: nodeList.filter((n) => !n.reachable).length,
    multiParentCount: nodeList.filter((n) => n.parents.length > 1).length,
    brokenLinkCount: edges.filter((e) => e.broken).length,
    cyclic,
  };

  const artifact = {
    repositoryName,
    editorBaseUrl: getEditorBaseUrl(repositoryName),
    // Customers can change this template if their editor uses a different path.
    editorUrlTemplate: `${getEditorBaseUrl(repositoryName)}/builder/pages/{id}`,
    generatedAt: new Date().toISOString(),
    rootId,
    stats,
    nodes: nodeList.sort((a, b) => (a.level ?? 99) - (b.level ?? 99)),
    edges,
  };

  const outDir = path.join(process.cwd(), "artifacts");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "repoTree.json");
  await fs.writeFile(outPath, JSON.stringify(artifact, null, 2));

  console.log(
    `✅ Wrote ${outPath}\n` +
      `   nodes=${stats.nodeCount} edges=${stats.edgeCount} ` +
      `maxLevel=${stats.maxLevel} orphans=${stats.orphanCount} ` +
      `multiParent=${stats.multiParentCount} broken=${stats.brokenLinkCount} ` +
      `cyclic=${stats.cyclic}`
  );
}

main().catch((err) => {
  console.error("❌ Treeify analysis failed:", err);
  process.exit(1);
});
