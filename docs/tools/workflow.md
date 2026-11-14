# Workflow Tools (`nav_group_workflow`)

Tools covering deployment prep, WordPress setup, server configuration, CLI generation, and block font cleanup.

## Deployment Checklist — `checklist.js` → `checklist.html`
- Multi-site interactive deployment checklist seeded from `src/data/checklist-data.json` (**13 tasks** across `wp`, `seo`, and `woo` categories) with `localStorage` persistence.
- Supports adding/deleting sites (`#site-modal` native `<dialog>`, validated `http(s)` site URLs, `await App.confirm(...)` on deletion), adding custom tasks, editing task titles/descriptions (`#edit-modal` native `<dialog>`), category filtering, JSON import/export, and confetti celebration on 100% completion (`App.fireConfetti()`).
- Site tabs, links, and task rows render safely via `App.h`.

## Demo Generator — `demo-generator.js` → `demo-generator.html`
- Generates up to 100 mock WordPress records per run in **XML/WXR** (with split-`]]>` CDATA escaping), **CSV** (with `App.escapeCSV`), or **JSON**, downloading via `App.downloadFile`.
- Supports custom fields via `#field-modal` (`<dialog class="wpt-dialog" closedby="any">`) rendered safely with `App.h`.
- Generation yields smoothly to the main thread using `App.createYielder(50)` while updating `#processing-overlay` (`<dialog>`).

## Awesome Stack — `awesome-stack.js` → `awesomestack.html`
- Guided WordPress stack selector backed by `src/data/stack-config.json` with custom saved stacks in `localStorage` and JSON import/export.
- Prompts and deletions use `await App.prompt(...)` and `await App.confirm(...)`; stack cards and checkbox options render safely via `App.h` (with `<label>` checkbox rows and keyboard-focusable switches).

## Server Config Generator — `server-config-generator.js` → `server-config-generator.html`
- Toggle between **Apache** (`.htaccess`) and **Nginx** (`nginx.conf`) modes with synced `aria-pressed` state and accessible `sr-only peer` toggles (`peer-focus-visible:ring-2`); copies via `App.copyToClipboard(...)`.

## WP-CLI Builder — `wp-cli-builder.js` → `wp-cli-builder.html`
- Visually builds `wp search-replace`, `wp user generate`, `wp db export`, and `wp media regenerate` commands with delegated `.builder-input` listeners, associated `<label for="...">` controls, `peer-focus-visible` switches, and `App.copyToClipboard(...)`.
