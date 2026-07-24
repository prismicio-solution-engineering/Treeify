"use client";

import React from "react";
import type { TreeNode } from "./types";

export interface TreeContext {
  nodesById: Map<string, TreeNode>;
  isExpanded: (id: string) => boolean;
  toggle: (id: string) => void;
  select: (id: string) => void;
  selectedId: string | null;
  matchedIds: Set<string>;
  levelColor: (level: number | null) => string;
}

const LEVEL_INDENT = 22;

export function TreeRow({
  id,
  fieldPath,
  depth,
  ancestors,
  ctx,
}: {
  id: string;
  fieldPath: string | null;
  depth: number;
  ancestors: string[];
  ctx: TreeContext;
}) {
  const node = ctx.nodesById.get(id);
  if (!node) return null;

  const isCycle = ancestors.includes(id);
  const hasChildren = node.children.length > 0 && !isCycle;
  const expanded = hasChildren && ctx.isExpanded(id);
  const selected = ctx.selectedId === id;
  const matched = ctx.matchedIds.has(id);

  return (
    <div>
      <div
        onClick={() => ctx.select(id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "3px 8px",
          paddingLeft: 8 + depth * LEVEL_INDENT,
          borderRadius: 6,
          cursor: "pointer",
          background: selected
            ? "rgba(110,168,254,0.18)"
            : matched
            ? "rgba(126,231,135,0.12)"
            : "transparent",
          outline: matched ? "1px solid rgba(126,231,135,0.4)" : "none",
        }}
      >
        {/* caret */}
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) ctx.toggle(id);
          }}
          style={{
            width: 14,
            display: "inline-block",
            textAlign: "center",
            color: "var(--muted)",
            userSelect: "none",
          }}
        >
          {hasChildren ? (expanded ? "▾" : "▸") : ""}
        </span>

        {/* level pill */}
        <span
          title={node.level === null ? "unreachable" : `level ${node.level}`}
          style={{
            fontSize: 11,
            fontWeight: 600,
            minWidth: 20,
            textAlign: "center",
            borderRadius: 4,
            padding: "0 5px",
            color: "#0d1117",
            background: ctx.levelColor(node.level),
          }}
        >
          {node.level ?? "∅"}
        </span>

        {/* title */}
        <span style={{ fontWeight: id === ancestors[0] || depth === 0 ? 600 : 400 }}>
          {node.title}
        </span>

        {/* type badge */}
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "0 5px",
          }}
        >
          {node.type}
        </span>

        {node.parents.length > 1 && (
          <span
            title={`shared — linked from ${node.parents.length} parents`}
            style={{ fontSize: 11, color: "var(--l3)" }}
          >
            ⇉ ×{node.parents.length}
          </span>
        )}
        {isCycle && (
          <span title="cycle — already an ancestor on this branch" style={{ fontSize: 11, color: "var(--danger)" }}>
            ↺ cycle
          </span>
        )}

        {/* field path from parent */}
        {fieldPath && (
          <span
            className="mono"
            title={`linked via ${fieldPath}`}
            style={{
              marginLeft: "auto",
              fontSize: 10.5,
              color: "var(--muted)",
              opacity: 0.8,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 280,
            }}
          >
            {fieldPath}
          </span>
        )}
      </div>

      {expanded &&
        node.children.map((child, i) => (
          <TreeRow
            key={`${ancestors.join(">")}>${id}>${child.id}#${i}`}
            id={child.id}
            fieldPath={child.fieldPath}
            depth={depth + 1}
            ancestors={[...ancestors, id]}
            ctx={ctx}
          />
        ))}
    </div>
  );
}
