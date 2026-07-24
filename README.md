# 🌳 Treeify — Prismic Repo Tree

Visualize a Prismic repository's **Content Relationship hierarchy** as an
interactive, searchable tree.

A root **Master Config** document links to **Main**, which links to section
documents (Homepage, Sports, Events, …), each linking down to
view‑config → view → component documents. Treeify fetches every document,
walks its fields, follows every Content Relationship link, and renders the
resulting graph.

It is built as a **reusable template**: point it at any Prismic repo by
changing one environment variable. The analysis is generic — it does not care
about your specific custom types; it walks whatever fields exist and finds
whatever document links exist.

Architecture mirrors the Slicify "slice‑analysis" pattern: a standalone script
in `/scripts` fetches content with `client.dangerouslyGetAll()`, writes a JSON
artifact to `/artifacts`, an API route runs the script on demand, and a client
page reads the artifact and renders the dashboard.

---

## What you get

| Part | Location |
|------|----------|
| **Content model** — 6 custom types + 2 link‑bearing slices, created via the Prismic CLI | `customtypes/`, `slices/`, and `scripts/model.sh` |
| **Analysis script** — deep‑walks every field, builds the graph, writes the snapshot | `scripts/buildRepoTree.ts` → `artifacts/repoTree.json` |
| **API route** — `GET` returns the snapshot, `POST` re‑runs the analysis | `app/api/repo-tree/route.ts` |
| **Visualization page** — collapsible tree, search, node detail, editor deep‑links, refresh, CSV/JSON export | `app/repo-tree/` |

---

## Configuration (env / prismic.config.json)

Everything is driven by two values, so you can aim Treeify at your own repo:

```bash
# .env.local  (copy from .env.local.example)
PRISMIC_REPO=your-repo-name          # falls back to repositoryName in prismic.config.json
PRISMIC_READ_TOKEN=                  # optional — only if your Content API is not public
```

- `PRISMIC_REPO` — the repository name/domain. If unset, Treeify reads
  `repositoryName` from `prismic.config.json` (written by `npx prismic init`).
- `PRISMIC_READ_TOKEN` — a permanent Content API access token. Only needed if
  your repository's API access is **not** public
  (Prismic dashboard → *Settings → API & Security*).

No code changes are needed to switch repositories.

---

## Run it

```bash
npm install
npm run tree-analysis      # fetch + build artifacts/repoTree.json (also runs on `predev`)
npm run dev                # open http://localhost:3000/repo-tree
```

Click **↻ Refresh** on the page to re‑run the analysis without restarting.

---

## The content model (how the hierarchy is expressed)

Created entirely through `npx prismic` (see `scripts/model.sh`). Content
Relationship fields appear at **three** levels on purpose, so the analyzer is
exercised against every real shape:

```
master_config ──main──▶ main_config
     │                       │ sections[]  (group)
     │ global_components[]   ▼
     │  (group)          section ──default_view_config──▶ view_config
     ▼                       │  slices: view_config_list[].view_config
  component ◀────────────    ▼
     ▲  related_component  view_config ──view──▶ view
     │                       │ fallback_views[]  (group)
     │                       ▼
     └── view.components[]  view
         view.slices: component_grid[].component ──▶ component
```

| Where the link lives | Example field path |
|----------------------|--------------------|
| **Top‑level field** | `data.main`, `data.default_view_config`, `data.view` |
| **Inside a repeatable group** | `data.sections[0].section`, `data.components[2].component` |
| **Inside a slice's items** | `data.slices[1].primary.items[0].view_config` |

Recreate the model in a fresh repo:

```bash
npx prismic login
npx prismic init --no-setup   # creates a Type-Builder repo (do NOT pass --repo)
bash scripts/model.sh         # type/field/slice commands
npx prismic push              # push the model to the repo
```

> ⚠️ Always model through the CLI (`npx prismic type/field/slice …`).
> Never hand‑edit the generated `customtypes/*.json` or `slices/*/model.json`.

---

## How the analysis works

`scripts/buildRepoTree.ts`:

1. `client.dangerouslyGetAll()` — fetches **every** document.
2. Recursively walks each document's `data` (top‑level, group items, slice
   `primary`/`items`) and records every value shaped like a document link
   (`link_type: "Document"` + an `id`) as an **edge** `parent → child`, tagged
   with the **field path** it came through.
3. Builds a parent/child graph, finds the **root** (`master_config`, or a
   document titled "Master Config"), and assigns each node a **level** by
   shortest path from the root (BFS).
4. Real‑world cases:
   - **Multi‑parent** — a document linked from several parents is a *graph*
     node, not a tree node. All parents are listed; it appears under each.
   - **Cycles** — the BFS `visited` set and a per‑branch ancestor check mean the
     walk and the UI never loop forever (a back‑edge is shown as `↺ cycle`).
   - **Broken / unpublished targets** — links to documents not in the result
     set are flagged `broken` and shown as placeholder nodes.
5. Writes `artifacts/repoTree.json`:
   `nodes` (id, title, type, level, parents[], children[], path[]) +
   `edges` (from, to, fieldPath, broken) + summary `stats`.

---

## The page (`/repo-tree`)

- **Collapsible tree** rooted at Master Config; each row shows the node's
  **level**, **type**, and the **field path** linking it to its parent.
- **Search** any document (title / type / uid / id) — matching branches
  auto‑expand to reveal where each match sits.
- **Node detail** — path from root, all parents (with field paths), children,
  and document id.
- **Deep‑link** — "Open in Prismic editor" opens that document in the editor
  (`editorUrlTemplate` in the artifact; adjust it if your editor uses a
  different URL shape).
- **Refresh** — re‑runs the analysis (`POST /api/repo-tree`).
- **Export** — download the hierarchy as **CSV** or **JSON**.

---

## ⚠️ Caveats — read before trusting the picture

- **It's a point‑in‑time SNAPSHOT, not live.** The tree reflects the moment the
  analysis last ran. Click **Refresh** (or re‑run `npm run tree-analysis`) to
  update it.
- **Only relationships expressed as link/relationship FIELDS are captured.**
  Links hardcoded in the frontend, or URLs/document references embedded inside
  **rich text**, are invisible to the analysis — it walks structured fields
  only.
- **Shared / reused documents appear under _every_ parent.** A component linked
  from three views shows up three times (marked `⇉ ×3`). That is intentional —
  it is a graph, not a strict tree.
- **Published content only.** `dangerouslyGetAll()` reads the published API by
  default. Documents sitting in an unpublished **release** won't appear until
  the release is published (or until you point the client at that release ref).
- **Level = shortest path from root.** For multi‑parent nodes the displayed
  level is the shallowest route; other routes may be longer.

---

## Drop it into an existing Prismic + Next.js project

Copy these into your app and set `PRISMIC_REPO`:

- `scripts/buildRepoTree.ts` and `lib/config.ts` (the analysis engine)
- `app/api/repo-tree/route.ts` (the on‑demand runner)
- `app/repo-tree/` (the dashboard page)

The script and page are self‑contained and make no assumptions about your
custom types.
