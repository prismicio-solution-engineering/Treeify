# Repo Tree

An external, read-only viewer of a Prismic repository's Content Relationship
hierarchy. It renders the structure as an interactive tree with a downloadable
export, so content and marketing teams can see how documents link together and
find where any document sits. It is a standalone alternative to an in-Prismic
view of the hierarchy, which Prismic does not currently provide.

## What it does

- **Interactive hierarchy tree** — the document graph rooted at a top-level
  config document, with connector rails, expand/collapse, and a default
  three-level view.
- **Search and locate** — find any document by title, type, uid, or id; matching
  branches auto-expand. Selecting a node shows its path from the root and its
  parents and children.
- **Reuse signals** — documents linked from more than one parent are flagged
  with a graduated accent scaled by parent count, and hovering a node highlights
  every place it appears. This is for spotting over-reused or redundant
  documents.
- **Export** — download the whole hierarchy as CSV or JSON.

It never writes to Prismic.

## How it works

`scripts/buildRepoTree.ts`:

1. Fetches every document via the Content API (`dangerouslyGetAll`).
2. Walks each document's fields for Content Relationship / document-link values —
   including links nested inside groups and inside slice primary/items — and
   records each as an edge parent → child, tagged with the field path it came
   through.
3. Builds a parent/child graph, selects the root document, and assigns each node
   a level by shortest path from the root (BFS). Multi-parent documents, cycles,
   and broken links are handled.
4. Writes `artifacts/repoTree.json`.

The front end (`app/repo-tree/`) reads that snapshot through
`app/api/repo-tree/route.ts` (`GET` returns it, `POST` re-runs the analysis).

## Model assumptions

The analysis is type-agnostic: it walks whatever fields exist and finds any
document links, so your custom-type, field, and slice names can be anything. Two
assumptions hold:

- The hierarchy is expressed with **Content Relationship (document link) fields**.
  Links that exist only in frontend code, or references embedded in rich text,
  are not detected.
- There is a **single root document**. Set its type with `TREEIFY_ROOT_TYPE`
  (default `master_config`; falls back to a document titled "Master Config").
  Documents not reachable from the root are listed separately as orphans.

The example type names (`master_config`, `main_config`, `section`, `view_config`,
`view`, `component`) are only that — an example.

## Configure

Set via environment or `prismic.config.json`:

- `PRISMIC_REPO` — repository name/domain. If unset, falls back to
  `repositoryName` in `prismic.config.json`.
- `PRISMIC_READ_TOKEN` — Content API access token. Only needed if the repo's API
  is not public. Server-side only; never sent to the browser.
- `TREEIFY_ROOT_TYPE` — custom-type id of your root document (default
  `master_config`).

Editor deep-links use `https://<repo>.prismic.io/builder/pages/{id}` (stored in
the artifact as `editorUrlTemplate`; change it in `scripts/buildRepoTree.ts` if
your editor URLs differ).

## Run

```
npm install
npm run tree-analysis     # fetch + build artifacts/repoTree.json
npm run dev               # http://localhost:3000/repo-tree
```

`npm run dev` runs the analysis first (via `predev`). Use the Refresh button in
the UI, or re-run `npm run tree-analysis`, to update the snapshot.

## Access / gating

The app has no authentication of its own. It is read-only, but it exposes your
repository's structure (document titles, types, hierarchy) to anyone who can
reach the URL. If you deploy it, put it behind access control:

- **Host-level protection** — Vercel password/SSO deployment protection, a VPN,
  or a reverse proxy with auth. No code changes.
- **Your own auth** — add Next.js middleware gating `/repo-tree` and
  `/api/repo-tree`.

`PRISMIC_READ_TOKEN` stays on the server regardless.

## Rebuild against your own repo

Point it at an existing repo: set `PRISMIC_REPO`, `PRISMIC_READ_TOKEN` (if
private), and `TREEIFY_ROOT_TYPE`, then run. Nothing else is required — the
analyzer adapts to your model.

To recreate the example content model in a fresh repo, use the Prismic CLI (the
models are defined in `scripts/model.sh` and pushed via the CLI, never
hand-edited):

```
npx prismic login
npx prismic init --no-setup    # creates a Type-Builder repo; do not pass --repo
bash scripts/model.sh          # creates the types + slices via the CLI
npx prismic push               # pushes the model
```

Then seed documents and point `PRISMIC_REPO` at that repo.

## Caveats

- **Snapshot, not live.** Reflects the last analysis run; refresh to update.
- **Only link/relationship fields are captured** — not frontend-hardcoded links
  or references inside rich text.
- **Shared documents appear under every parent** — it is a graph, not a strict
  tree.
- **Published content only.** `dangerouslyGetAll` reads the published API;
  documents in an unpublished release do not appear until published.
- **Level is the shortest path from the root**; other paths to a multi-parent
  node may be longer.
