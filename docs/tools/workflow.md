# Workflow Tools (`nav_group_workflow`)

Five tools covering deployment prep and WordPress setup.

## Deployment Checklist — `checklist.js` → `checklist.html`
- Interactive checklist driven by `src/data/checklist-data.json` (**13 tasks**).
- Progress tracking with confetti celebration on completion (`canvas-confetti`).

## Demo Generator — `demo-generator.js` → `demo-generator.html`
- Generates mock WordPress content in three formats: **XML/WXR**, **CSV**, **JSON**.
- Configurable post/page counts, titles, bodies; downloads via Blob.

## Awesome Stack — `awesome-stack.js` → `awesomestack.html`
- Guided stack recommendations from presets in `src/data/stack-config.json`.

## Server Config Generator — `server-config-generator.js` → `server-config-generator.html`
- Toggle between **Apache** (.htaccess) and **Nginx** output modes; button state swapped via Tailwind class replacement (`text-zinc-400` / `bg-zinc-800 shadow`).

## WP-CLI Builder — `wp-cli-builder.js` → `wp-cli-builder.html`
- Builds `wp search-replace` commands: old/new domain inputs, **Dry Run** toggle (default on), **Skip GUID column** toggle (default on).
- UI rendered inline by the module using `data-i18n` keys (`label_search_for`, `label_replace_with`, `opt_dry_run`, `opt_skip_columns`); inputs styled with the shared `builder-input` class.
