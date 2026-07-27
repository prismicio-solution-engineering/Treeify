"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { RepoTree, TreeNode } from "./types";
import { TreeRow, type TreeContext } from "./TreeRow";

export default function RepoTreePage() {
  const [data, setData] = useState<RepoTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (method: "GET" | "POST") => {
    method === "POST" ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/repo-tree", { method });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setData(json);
      // Default to a full, readable canvas: expand the first three levels.
      const next = new Set<string>();
      json.nodes.forEach((n: TreeNode) => {
        if (n.level !== null && n.level <= 2) next.add(n.id);
      });
      if (json.rootId) next.add(json.rootId);
      setExpanded(next);
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

  // Type → colour, assigned in depth order (root type warmest). This is the
  // ONLY type cue on a row (a slim tick); the word shows only in the panel.
  const PALETTE = [
    "var(--c0)",
    "var(--c1)",
    "var(--c2)",
    "var(--c3)",
    "var(--c4)",
    "var(--c5)",
    "var(--c6)",
    "var(--c7)",
  ];
  const typeColor = useMemo(() => {
    if (!data) return (_: string) => "var(--muted)";
    const minLevel = new Map<string, number>();
    for (const n of data.nodes) {
      const lvl = n.level ?? 99;
      if (!minLevel.has(n.type) || lvl < minLevel.get(n.type)!)
        minLevel.set(n.type, lvl);
    }
    const order = [...minLevel.keys()].sort(
      (a, b) => minLevel.get(a)! - minLevel.get(b)! || a.localeCompare(b)
    );
    const map: Record<string, string> = {};
    order.forEach((t, i) => (map[t] = PALETTE[i % PALETTE.length]));
    return (t: string) => map[t] ?? "var(--muted)";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Descendant count per node (unique docs in the subtree), cycle-safe.
  const subtreeSize = useMemo(() => {
    const memo = new Map<string, number>();
    const compute = (id: string, seen: Set<string>): Set<string> => {
      const acc = new Set<string>();
      const node = nodesById.get(id);
      if (!node) return acc;
      for (const c of node.children) {
        if (seen.has(c.id)) continue;
        acc.add(c.id);
        const next = new Set(seen);
        next.add(c.id);
        compute(c.id, next).forEach((x) => acc.add(x));
      }
      return acc;
    };
    return (id: string) => {
      if (memo.has(id)) return memo.get(id)!;
      const n = compute(id, new Set([id])).size;
      memo.set(id, n);
      return n;
    };
  }, [nodesById]);

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
      hoveredId,
      onHover: setHoveredId,
      typeColor,
      subtreeSize,
    }),
    [
      nodesById,
      isExpanded,
      toggle,
      selectedId,
      matchedIds,
      hoveredId,
      typeColor,
      subtreeSize,
    ]
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

  type Metric = {
    label: string;
    value: React.ReactNode;
    tone?: "accent" | "warn" | "danger";
    on?: boolean;
  };
  const metrics: Metric[] = data
    ? [
        { label: "documents", value: data.stats.documentCount },
        { label: "relationships", value: data.stats.edgeCount },
        { label: "max depth", value: data.stats.maxLevel },
        {
          label: "shared",
          value: data.stats.multiParentCount,
          tone: "accent",
          on: data.stats.multiParentCount > 0,
        },
        {
          label: "orphans",
          value: data.stats.orphanCount,
          tone: "warn",
          on: data.stats.orphanCount > 0,
        },
        {
          label: "broken links",
          value: data.stats.brokenLinkCount,
          tone: "danger",
          on: data.stats.brokenLinkCount > 0,
        },
      ]
    : [];

  const metricStyle = (m: Metric) => {
    if (!m.tone) return { value: "var(--text)", weight: 550, label: "var(--muted)" };
    if (!m.on) return { value: "var(--muted)", weight: 450, label: "var(--muted)" };
    const c =
      m.tone === "accent"
        ? "var(--accent)"
        : m.tone === "danger"
        ? "var(--danger)"
        : "var(--warn)";
    return { value: c, weight: 700, label: c };
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 28px 64px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              margin: 0,
              color: "var(--text)",
            }}
          >
            Repo Tree
          </h1>
          <p style={{ color: "var(--text-2)", margin: "6px 0 0", fontSize: 13 }}>
            Content Relationship hierarchy
          </p>
          {data && (
            <p
              className="mono"
              style={{
                color: "var(--muted)",
                opacity: 0.6,
                margin: "5px 0 0",
                fontSize: 10.5,
              }}
              title="Point-in-time snapshot, not live."
            >
              {data.repositoryName} · snapshot{" "}
              {new Date(data.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => load("POST")} disabled={refreshing || loading}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button onClick={exportCSV} disabled={!data}>
            Export CSV
          </button>
          <button onClick={exportJSON} disabled={!data}>
            Export JSON
          </button>
        </div>
      </header>

      {error && (
        <div
          style={{
            marginTop: 24,
            padding: "10px 14px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text)",
          }}
        >
          {error}
        </div>
      )}

      {data && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 22px",
            margin: "24px 0",
            padding: "12px 0",
            borderTop: "1px solid var(--divider)",
            borderBottom: "1px solid var(--divider)",
            fontSize: 12.5,
          }}
        >
          {metrics.map((m, i) => {
            const s = metricStyle(m);
            return (
              <span
                key={m.label}
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 6,
                  paddingLeft: i === 0 ? 0 : 22,
                  borderLeft: i === 0 ? "none" : "1px solid var(--divider)",
                }}
              >
                <span style={{ color: s.value, fontWeight: s.weight }}>
                  {m.value}
                </span>
                <span style={{ color: s.label }}>{m.label}</span>
              </span>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 320px",
          gap: 32,
          marginTop: data ? 0 : 24,
          alignItems: "start",
        }}
      >
        {/* Tree */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Search title, type, uid, or id…"
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

          {data && (
            <div
              style={{
                display: "flex",
                gap: 14,
                marginBottom: 12,
                fontSize: 11,
                color: "var(--muted)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "var(--parent)",
                  }}
                />
                parents
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "var(--child)",
                  }}
                />
                children
              </span>
            </div>
          )}

          {term && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              {matchedIds.size} match{matchedIds.size === 1 ? "" : "es"} · branches
              auto-expanded
            </div>
          )}

          {loading && (
            <p style={{ color: "var(--muted)" }}>Analyzing repository…</p>
          )}

          {data && data.rootId ? (
            <div style={{ marginLeft: -8 }}>
              <TreeRow
                id={data.rootId}
                depth={0}
                lastFlags={[]}
                ancestors={[]}
                ctx={ctx}
              />
            </div>
          ) : data && !data.rootId ? (
            <p style={{ color: "var(--muted)" }}>
              No <span className="mono">master_config</span> (root) document found.
              Showing orphans only.
            </p>
          ) : null}

          {orphans.length > 0 && (
            <details style={{ marginTop: 24 }}>
              <summary
                style={{
                  cursor: "pointer",
                  color: "var(--warn)",
                  fontWeight: 600,
                  fontSize: 12.5,
                }}
              >
                {orphans.length} document(s) not reachable from root
              </summary>
              <div style={{ marginTop: 8 }}>
                {orphans.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    style={{
                      padding: "4px 8px",
                      cursor: "pointer",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        flex: "0 0 auto",
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "var(--warn)",
                      }}
                    />
                    <span>{n.title}</span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        opacity: 0.7,
                      }}
                    >
                      {n.type}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Detail */}
        <aside
          style={{
            position: "sticky",
            top: 24,
            paddingLeft: 24,
            borderLeft: "1px solid var(--divider)",
            minHeight: 200,
          }}
        >
          {!selected ? (
            <p style={{ color: "var(--muted)", margin: 0, fontSize: 12.5 }}>
              Select a node to see its role, where it sits, and what links to it.
            </p>
          ) : (
            <div>
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  margin: "0 0 6px",
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <span
                  style={{
                    flex: "0 0 auto",
                    width: 3,
                    height: 15,
                    borderRadius: 2,
                    background:
                      selected.type === "unknown"
                        ? "var(--danger)"
                        : typeColor(selected.type),
                  }}
                />
                {selected.title}
              </h2>
              <div
                className="mono"
                style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 18 }}
              >
                {selected.type} · level{" "}
                {selected.level === null ? "unreachable" : selected.level}
              </div>
              {selected.parents.length > 1 && (
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 650,
                    color: "var(--parent)",
                    marginBottom: 18,
                  }}
                >
                  shared · linked from {selected.parents.length} parents
                </div>
              )}

              <a
                href={editorUrl(selected.id)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-block", marginBottom: 24 }}
              >
                <button className="open-editor">Open in Prismic editor →</button>
              </a>

              <Section title="Path from root">
                <div className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                  {selected.path.length
                    ? selected.path
                        .map((pid) => nodesById.get(pid)?.title ?? pid)
                        .join(" › ")
                    : "not reachable from root"}
                </div>
              </Section>

              <Section title={`Parents · ${selected.parents.length}`}>
                {selected.parents.length === 0 ? (
                  <span style={{ color: "var(--muted)" }}>none (root or orphan)</span>
                ) : (
                  selected.parents.map((p, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>
                      <a
                        onClick={() => setSelectedId(p.id)}
                        title={`linked via ${p.fieldPath}`}
                        style={{ cursor: "pointer" }}
                      >
                        {nodesById.get(p.id)?.title ?? p.id}
                      </a>
                    </div>
                  ))
                )}
              </Section>

              <Section title={`Children · ${selected.children.length}`}>
                {selected.children.length === 0 ? (
                  <span style={{ color: "var(--muted)" }}>none (leaf)</span>
                ) : (
                  selected.children.map((c, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>
                      <a
                        onClick={() => setSelectedId(c.id)}
                        title={`linked via ${c.fieldPath}`}
                        style={{ cursor: "pointer" }}
                      >
                        {nodesById.get(c.id)?.title ?? c.id}
                      </a>
                    </div>
                  ))
                )}
              </Section>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(selected.id);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                }}
                title={`id ${selected.id}${
                  selected.uid ? ` · uid ${selected.uid}` : ""
                }`}
                style={{ fontSize: 11, color: "var(--muted)", padding: "3px 9px" }}
              >
                {copied ? "Copied" : "Copy ID"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--muted)",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
