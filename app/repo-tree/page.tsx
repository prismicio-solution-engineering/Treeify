"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { RepoTree, TreeNode } from "./types";
import { TreeRow, type TreeContext } from "./TreeRow";

const LEVEL_VARS = ["--l0", "--l1", "--l2", "--l3", "--l4", "--l5"];

function levelColor(level: number | null): string {
  if (level === null) return "#5a6472";
  return `var(${LEVEL_VARS[level % LEVEL_VARS.length]})`;
}

export default function RepoTreePage() {
  const [data, setData] = useState<RepoTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async (method: "GET" | "POST") => {
    method === "POST" ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/repo-tree", { method });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setData(json);
      // expand root + its direct children by default
      if (json.rootId) {
        const root: TreeNode | undefined = json.nodes.find(
          (n: TreeNode) => n.id === json.rootId
        );
        const next = new Set<string>([json.rootId]);
        root?.children.forEach((c: { id: string }) => next.add(c.id));
        setExpanded(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load("GET");
  }, [load]);

  const nodesById = useMemo(() => {
    const m = new Map<string, TreeNode>();
    data?.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [data]);

  // Search: match id/uid/title/type; auto-expand each match's shortest path.
  const term = search.trim().toLowerCase();
  const matchedIds = useMemo(() => {
    const s = new Set<string>();
    if (!term || !data) return s;
    for (const n of data.nodes) {
      if (
        n.title.toLowerCase().includes(term) ||
        n.type.toLowerCase().includes(term) ||
        (n.uid ?? "").toLowerCase().includes(term) ||
        n.id.toLowerCase().includes(term)
      )
        s.add(n.id);
    }
    return s;
  }, [term, data]);

  const autoExpand = useMemo(() => {
    const s = new Set<string>();
    if (!data) return s;
    for (const id of matchedIds) {
      const node = nodesById.get(id);
      node?.path.forEach((p) => s.add(p));
    }
    return s;
  }, [matchedIds, nodesById, data]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const isExpanded = useCallback(
    (id: string) => expanded.has(id) || (term.length > 0 && autoExpand.has(id)),
    [expanded, autoExpand, term]
  );

  const ctx: TreeContext = useMemo(
    () => ({
      nodesById,
      isExpanded,
      toggle,
      select: setSelectedId,
      selectedId,
      matchedIds,
      levelColor,
    }),
    [nodesById, isExpanded, toggle, selectedId, matchedIds]
  );

  const orphans = useMemo(
    () => (data?.nodes ?? []).filter((n) => !n.reachable),
    [data]
  );

  const selected = selectedId ? nodesById.get(selectedId) : null;
  const editorUrl = (id: string) =>
    (data?.editorUrlTemplate ?? "").replace("{id}", id);

  const expandAll = () =>
    setExpanded(new Set((data?.nodes ?? []).map((n) => n.id)));
  const collapseAll = () =>
    setExpanded(new Set(data?.rootId ? [data.rootId] : []));

  // ── Exports ──────────────────────────────────────────────────────────────
  const download = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!data) return;
    download("repoTree.json", JSON.stringify(data, null, 2), "application/json");
  };

  const exportCSV = () => {
    if (!data) return;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [
      [
        "id",
        "title",
        "type",
        "level",
        "uid",
        "reachable",
        "parent_count",
        "child_count",
        "parents",
        "field_paths_from_parents",
        "path_titles",
      ].join(","),
    ];
    for (const n of data.nodes) {
      const pathTitles = n.path
        .map((pid) => nodesById.get(pid)?.title ?? pid)
        .join(" › ");
      rows.push(
        [
          esc(n.id),
          esc(n.title),
          esc(n.type),
          n.level ?? "",
          esc(n.uid ?? ""),
          n.reachable,
          n.parents.length,
          n.children.length,
          esc(n.parents.map((p) => p.id).join(" | ")),
          esc(n.parents.map((p) => p.fieldPath).join(" | ")),
          esc(pathTitles),
        ].join(",")
      );
    }
    download("repoTree.csv", rows.join("\n"), "text/csv");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>🌳 Repo Tree</h1>
          <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
            Content Relationship hierarchy
            {data ? (
              <>
                {" "}
                for <code>{data.repositoryName}</code> ·{" "}
                <span title="This is a point-in-time snapshot, not live.">
                  snapshot {new Date(data.generatedAt).toLocaleString()}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => load("POST")} disabled={refreshing || loading}>
            {refreshing ? "↻ Refreshing…" : "↻ Refresh"}
          </button>
          <button onClick={exportCSV} disabled={!data}>
            ⭳ CSV
          </button>
          <button onClick={exportJSON} disabled={!data}>
            ⭳ JSON
          </button>
        </div>
      </header>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid var(--danger)",
            borderRadius: 8,
            color: "var(--danger)",
            background: "rgba(255,123,114,0.08)",
          }}
        >
          {error}
        </div>
      )}

      {data && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 10,
            marginTop: 16,
          }}
        >
          {[
            ["Documents", data.stats.documentCount],
            ["Edges", data.stats.edgeCount],
            ["Max depth", data.stats.maxLevel],
            ["Shared (multi-parent)", data.stats.multiParentCount],
            ["Orphans", data.stats.orphanCount],
            ["Broken links", data.stats.brokenLinkCount],
            ["Cyclic", data.stats.cyclic ? "yes" : "no"],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
            </div>
          ))}
        </section>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 340px",
          gap: 16,
          marginTop: 16,
          alignItems: "start",
        }}
      >
        {/* Tree panel */}
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 12,
            minHeight: 300,
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Search documents by title, type, uid, or id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button onClick={expandAll} disabled={!data}>
              Expand all
            </button>
            <button onClick={collapseAll} disabled={!data}>
              Collapse
            </button>
          </div>

          {term && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
              {matchedIds.size} match{matchedIds.size === 1 ? "" : "es"} — branches
              auto-expanded
            </div>
          )}

          {loading && <p style={{ color: "var(--muted)" }}>Analyzing repository…</p>}

          {data && data.rootId ? (
            <TreeRow
              id={data.rootId}
              fieldPath={null}
              depth={0}
              ancestors={[]}
              ctx={ctx}
            />
          ) : data && !data.rootId ? (
            <p style={{ color: "var(--muted)" }}>
              No <code>master_config</code> (root) document found. Showing orphans
              only.
            </p>
          ) : null}

          {orphans.length > 0 && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: "pointer", color: "var(--muted)" }}>
                {orphans.length} document(s) not reachable from root
              </summary>
              <div style={{ marginTop: 6 }}>
                {orphans.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    style={{
                      padding: "3px 8px",
                      cursor: "pointer",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "var(--muted)" }}>∅</span>
                    <span>{n.title}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                      {n.type}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Detail panel */}
        <aside
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 14,
            position: "sticky",
            top: 16,
          }}
        >
          {!selected ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Select a node to see its type, level, parents, and the field paths
              linking it.
            </p>
          ) : (
            <div>
              <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>{selected.title}</h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                <Badge>type: {selected.type}</Badge>
                <Badge>
                  level: {selected.level === null ? "unreachable" : selected.level}
                </Badge>
                {selected.uid && <Badge>uid: {selected.uid}</Badge>}
              </div>

              <a
                href={editorUrl(selected.id)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "block", marginBottom: 14 }}
              >
                <button style={{ width: "100%" }}>↗ Open in Prismic editor</button>
              </a>

              <Section title={`Path from root (${selected.path.length})`}>
                <div className="mono" style={{ fontSize: 12 }}>
                  {selected.path.length
                    ? selected.path
                        .map((pid) => nodesById.get(pid)?.title ?? pid)
                        .join(" › ")
                    : "— not reachable from root —"}
                </div>
              </Section>

              <Section title={`Parents (${selected.parents.length})`}>
                {selected.parents.length === 0 ? (
                  <em style={{ color: "var(--muted)" }}>none (root or orphan)</em>
                ) : (
                  selected.parents.map((p, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <a onClick={() => setSelectedId(p.id)} style={{ cursor: "pointer" }}>
                        {nodesById.get(p.id)?.title ?? p.id}
                      </a>
                      <div
                        className="mono"
                        style={{ fontSize: 11, color: "var(--muted)" }}
                      >
                        via {p.fieldPath}
                      </div>
                    </div>
                  ))
                )}
              </Section>

              <Section title={`Children (${selected.children.length})`}>
                {selected.children.length === 0 ? (
                  <em style={{ color: "var(--muted)" }}>none (leaf)</em>
                ) : (
                  selected.children.map((c, i) => (
                    <div key={i}>
                      <a onClick={() => setSelectedId(c.id)} style={{ cursor: "pointer" }}>
                        {nodesById.get(c.id)?.title ?? c.id}
                      </a>
                    </div>
                  ))
                )}
              </Section>

              <Section title="Document id">
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {selected.id}
                </div>
              </Section>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 11,
        border: "1px solid var(--border)",
        borderRadius: 4,
        padding: "1px 6px",
        color: "var(--muted)",
      }}
    >
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "var(--muted)",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
