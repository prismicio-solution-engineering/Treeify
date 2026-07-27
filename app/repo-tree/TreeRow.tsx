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
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  typeColor: (type: string) => string;
  subtreeSize: (id: string) => number;
}

const RAIL_WIDTH = 20;

// One connector column. `kind` decides which line segments are drawn.
function Guide({ kind }: { kind: "empty" | "through" | "mid" | "end" }) {
  const line = "var(--rail)";
  return (
    <span
      style={{
        flex: `0 0 ${RAIL_WIDTH}px`,
        position: "relative",
        alignSelf: "stretch",
      }}
    >
      {/* vertical: full height for through/mid, top-half for end */}
      {(kind === "through" || kind === "mid") && (
        <i
          style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: line }}
        />
      )}
      {kind === "end" && (
        <i
          style={{ position: "absolute", left: "50%", top: 0, height: "50%", width: 1, background: line }}
        />
      )}
      {/* horizontal elbow into the node */}
      {(kind === "mid" || kind === "end") && (
        <i
          style={{ position: "absolute", left: "50%", top: "50%", right: 2, height: 1, background: line }}
        />
      )}
    </span>
  );
}

export function TreeRow({
  id,
  depth,
  lastFlags,
  ancestors,
  ctx,
}: {
  id: string;
  depth: number;
  lastFlags: boolean[]; // isLast for each path node from depth 1 → depth
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

  const parentCount = node.parents.length;
  const childCount = node.children.length;
  const shared = parentCount > 1;
  const isBroken = node.type === "unknown";
  const size = ctx.subtreeSize(id);

  // Co-highlight every occurrence of the hovered node → reuse you can see.
  const coHovered = ctx.hoveredId === id;
  const background = selected
    ? "var(--accent-soft)"
    : coHovered
    ? shared
      ? "var(--accent-soft)"
      : "var(--hover)"
    : "transparent";

  // Graduated reuse emphasis: accent intensity climbs with parent count.
  const reusePct = Math.min(16 + parentCount * 6, 54);

  return (
    <div>
      <div
        onClick={() => ctx.select(id)}
        onMouseEnter={() => ctx.onHover(id)}
        onMouseLeave={() => ctx.onHover(null)}
        style={{
          display: "flex",
          alignItems: "stretch",
          background,
          boxShadow: selected || matched ? "inset 2px 0 0 var(--accent)" : "none",
          cursor: "pointer",
        }}
      >
        {/* elbow connector rails */}
        {lastFlags.map((_, j) => {
          const kind =
            j < depth - 1
              ? lastFlags[j]
                ? "empty"
                : "through"
              : lastFlags[j]
              ? "end"
              : "mid";
          return <Guide key={j} kind={kind} />;
        })}

        {/* content */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px 6px 4px",
          }}
        >
          {/* caret */}
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) ctx.toggle(id);
            }}
            style={{
              flex: "0 0 16px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 15,
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            {hasChildren ? (expanded ? "▾" : "▸") : ""}
          </span>

          {/* type cue — a single colour-coded tick */}
          <span
            aria-hidden
            title={node.type}
            style={{
              flex: "0 0 auto",
              width: 3,
              height: 15,
              borderRadius: 2,
              background: isBroken ? "var(--danger)" : ctx.typeColor(node.type),
            }}
          />

          {/* title — the hero */}
          <span
            style={{
              color: "var(--text)",
              fontWeight: depth === 0 ? 650 : 500,
              fontSize: depth === 0 ? 15 : 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flexShrink: 1,
            }}
          >
            {node.title}
          </span>

          {/* subtree weight — feel the branch without expanding it */}
          {hasChildren && (
            <span
              title={`${size} descendant${size === 1 ? "" : "s"}`}
              style={{
                flex: "0 0 auto",
                fontSize: 11,
                fontVariantNumeric: "tabular-nums",
                color: size >= 8 ? "var(--text-2)" : "var(--muted)",
              }}
            >
              {size}
            </span>
          )}

          {/* parents (↑, warm) and children (↓, green), right-aligned column.
              The parent pill's fill deepens with parent count = reuse. */}
          {(parentCount > 0 || childCount > 0) && (
            <span
              style={{
                marginLeft: "auto",
                flex: "0 0 auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {parentCount > 0 && (
                <span
                  title={`${parentCount} parent${parentCount === 1 ? "" : "s"}`}
                  style={{
                    fontSize: 11,
                    fontWeight: 650,
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--text)",
                    background: `color-mix(in srgb, var(--parent) ${reusePct}%, transparent)`,
                    border: `1px solid color-mix(in srgb, var(--parent) ${Math.min(
                      reusePct + 18,
                      72
                    )}%, transparent)`,
                    borderRadius: 999,
                    padding: "0 7px",
                    lineHeight: "17px",
                  }}
                >
                  {parentCount}
                </span>
              )}
              {childCount > 0 && (
                <span
                  title={`${childCount} child${childCount === 1 ? "" : "ren"}`}
                  style={{
                    fontSize: 11,
                    fontWeight: 650,
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--text)",
                    background: "color-mix(in srgb, var(--child) 20%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--child) 40%, transparent)",
                    borderRadius: 999,
                    padding: "0 7px",
                    lineHeight: "17px",
                  }}
                >
                  {childCount}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {expanded &&
        node.children.map((child, i) => (
          <TreeRow
            key={`${ancestors.join(">")}>${id}>${child.id}#${i}`}
            id={child.id}
            depth={depth + 1}
            lastFlags={[...lastFlags, i === node.children.length - 1]}
            ancestors={[...ancestors, id]}
            ctx={ctx}
          />
        ))}
    </div>
  );
}
