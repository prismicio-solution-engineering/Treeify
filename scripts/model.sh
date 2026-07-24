#!/usr/bin/env bash
#
# Treeify content model — created entirely through the `npx prismic` CLI.
# (Never hand-edit the generated customtypes/*.json or slices/*.json.)
#
# Models a deep hierarchy linked by Content Relationship fields:
#
#   master_config ──main──▶ main_config
#        │                      │
#        │ global_components[]  │ sections[] (group)
#        ▼                      ▼
#   component ◀──────────────  section ──default_view_config──▶ view_config
#        ▲   related_component     │  slices: view_config_list[].view_config ─▶ view_config
#        │                         ▼
#        │                    view_config ──view──▶ view
#        │                         │ fallback_views[] (group) ─▶ view
#        │                         ▼
#        └── view.components[] ── view ──▶ component
#            view.slices: component_grid[].component ─▶ component
#
# Content Relationships appear at THREE levels, on purpose:
#   • top-level            (master_config.main, section.default_view_config, …)
#   • inside groups        (main_config.sections[].section, view.components[].component, …)
#   • inside slice items   (section → view_config_list, view → component_grid)
#
# Run AFTER `npx prismic init` (which creates the Type-Builder repo) and
# `npx prismic login`. Finish with `npx prismic push`.
set -euo pipefail

run() { echo "▶ prismic $*"; npx prismic "$@"; }

echo "── 1/3  Create content types ───────────────────────────────"
run type create "Master Config" --id master_config --single
run type create "Main Config"   --id main_config   --single
run type create "Section"       --id section       --format page
run type create "View Config"   --id view_config    --format page
run type create "View"          --id view           --format page
run type create "Component"     --id component       --format page

echo "── 2/3  Create link-bearing slices ─────────────────────────"
run slice create "View Config List" --id view_config_list
run field add group items --to-slice view_config_list --label "View Configs"
run field add content-relationship items.view_config --to-slice view_config_list \
    --custom-type view_config --label "View Config"

run slice create "Component Grid" --id component_grid
run field add group items --to-slice component_grid --label "Components"
run field add content-relationship items.component --to-slice component_grid \
    --custom-type component --label "Component"

echo "── 3/3  Add fields + wire relationships ────────────────────"

# master_config (root)
run field add text title --to-type master_config --label "Title"
run field add content-relationship main --to-type master_config \
    --custom-type main_config --label "Main (root child)"
run field add group global_components --to-type master_config --label "Global Components"
run field add content-relationship global_components.component --to-type master_config \
    --custom-type component --label "Component"

# main_config
run field add text title --to-type main_config --label "Title"
run field add group sections --to-type main_config --label "Sections"
run field add content-relationship sections.section --to-type main_config \
    --custom-type section --label "Section"

# section
run field add text title --to-type section --label "Title"
run field add content-relationship default_view_config --to-type section \
    --custom-type view_config --label "Default View Config"
run slice connect view_config_list --to section

# view_config
run field add text title --to-type view_config --label "Title"
run field add content-relationship view --to-type view_config \
    --custom-type view --label "View (primary child)"
run field add group fallback_views --to-type view_config --label "Fallback Views"
run field add content-relationship fallback_views.view --to-type view_config \
    --custom-type view --label "View"

# view
run field add text title --to-type view --label "Title"
run field add group components --to-type view --label "Components"
run field add content-relationship components.component --to-type view \
    --custom-type component --label "Component"
run slice connect component_grid --to view

# component (self-reference enables shared / multi-parent / cyclic cases)
run field add text title --to-type component --label "Title"
run field add content-relationship related_component --to-type component \
    --custom-type component --label "Related Component"

echo
echo "✅ Model built locally. Review with 'npx prismic status', then:"
echo "   npx prismic push"
