# Core Framework (`src/core/`)

## `app.js` — Application Facade

Singleton `App` object exposing:
- **State accessors**: `App.translations`, `App.currentLang` (proxied to `State`).
- **Registry**: `App.tools` map + `App.registerTool(id, config)` → instantiates `BaseTool`.
- **Consent**: `App.setConsent(level)`, `App.getConsent()`.
- **Backup & Restore**: `App.exportBackup(opts)`, `App.importBackup(fileOrObject, { mode, reload })`.
- **UI**: `App.showToast(msg, opts)`, `App.confirm(message, opts)`, `App.prompt(message, defaultValue, opts)`, `App.fireConfetti()`.
- **Utilities**: `App.yieldToMain()`, `App.createYielder(budgetMs)`, `App.h(tag, props, ...children)`, `App.escapeCSV`, `App.escapeHtml`, `App.htmlToMarkdown`, `App.formatSize`, `App.downloadFile`, `App.downloadZip`, `App.copyToClipboard`.
- **Lifecycle**: `init()` (idempotent via `isReady` + `_initPromise`), initializes theme (`UI.initTheme()`), sets direction, awaits `I18n.loadData()`, translates page, initializes observer and command palette, renders initial icons via `renderIcons()`, surfaces any post-reload `wpt_backup_flash` toast, and dispatches `appReady`.
- Icon compatibility shim: exposes `window.lucide = { createIcons, icons }` backed by the tree-shaken subset in `src/core/icons.js`.

## `backup.js` — Site-Wide Backup & Restore

Manages single-file JSON backup/restore (`wptoolbox-backup-YYYY-MM-DD.json`) across an explicit `BACKUP_REGISTRY` of known `wptoolbox_*` `localStorage` keys (`wptoolbox_checklist_sites`, `wptoolbox_checklist_active_site`, `wptoolbox_user_snippets`, `wptoolbox_favs`, `wptoolbox_blocksy_palettes`, `wptoolbox_stacks`, `wptoolbox_lang`). Explicitly excludes `wpt-consent` and ignores unknown keys.
- `exportBackup({ download })`: builds `{ app: 'WPToolbox', schemaVersion: 1, exportedAt, data }` and downloads via `App.downloadFile`.
- `parseAndValidateBackup(fileOrObject)`: enforces a 5 MiB (`MAX_BACKUP_BYTES`) size cap, validates `app`/`schemaVersion`/`data`, and runs shared tool sanitizers from `sanitizers.js` (including stripping unsafe non-HTTP(S) URLs via `getSafeHttpUrl`).
- `importBackup(fileOrObject, { mode = 'merge', reload = true })`: prompts with a per-type count summary via `App.confirm`, applies either `'merge'` (union by `id`/name) or `'replace'` (overwrite keys in backup), stores a post-reload toast flash in `sessionStorage`, and reloads the page.
- `getStorageSummary()` / `clearLocalData()`: computes per-type counts and byte sizes, and removes only `wptoolbox_*` keys (leaving `wpt-consent` intact).

## `sanitizers.js` — Shared Data Sanitizers

Pure, side-effect-free validators/sanitizers (`getSafeHttpUrl`, `sanitizeImportedSites`, `safeHex`, `sanitizePaletteColors`, `sanitizeSavedPalettes`, `sanitizeUserSnippets`, `sanitizeSavedStacks`) shared by `backup.js` and re-exported from their respective tool modules (`checklist.js`, `blocksy-palette.js`, `snippets.js`, `awesome-stack.js`) so backup imports reuse the exact same sanitization without bundling unrelated tool UIs into `main`.

## `icons.js` — Curated Lucide Icon Subset

Imports only the Lucide icons referenced across HTML pages, JS modules, and `src/data/*.json` (instead of importing the full ~1,500-icon namespace) and exposes:
- `icons`: PascalCase icon map.
- `createIcons(options)`: wraps Lucide's `createIcons`, defaulting `icons` to the curated subset.
- `renderIcons(root = document, attrs)`: renders `[data-lucide]` elements within `root`; in dev mode (`import.meta.env.DEV`), warns once per missing icon name if any `[data-lucide]` name is absent from `icons`.

## `consent.js` — Consent Mode v2

Google Consent Mode v2 storage and update manager:
- `getConsent()`: reads `'denied' | 'granted' | 'all' | null` from `localStorage` key `'wpt-consent'`.
- `setConsent(level)`: persists `'denied' | 'granted' | 'all'` and calls `gtag('consent', 'update', ...)`.

See [docs/analytics.md](../analytics.md) for the GTM/GA4 setup, consent flow, and CSP details.

## `base-tool.js` — BaseTool Class

Shared plumbing for every tool: file drop zone + input wiring, progress bar/status/count updates, processing overlay with cancel button, results section reveal, and `processInChunks()` yielding via `Utils.yieldToMain()`. Tools configure element IDs through the config object (see overview table). Convention: initial logic goes in the `onInit` hook, which `BaseTool` invokes immediately when `!window.App || window.App.isReady`, or defers until the `appReady` event so async translations are ready.

## `i18n.js` — Internationalization Engine

- `loadData()`: dynamically imports `src/data/translations.json` (keeping the ~50 KB payload out of the shared `main` chunk) alongside `src/data/nav.json` and populates `State`.
- Applies translations to DOM: `data-i18n` (text), `data-i18n-html` (rich content — first-party trust boundary backed solely by bundled `src/data/translations.json`), `data-i18n-placeholder` (inputs).
- `updateDirection()`: sets `dir="rtl"` and `lang="ar"` when Arabic is active.
- Per-page SEO metadata from `title_<pageKey>` / `desc_<pageKey>` translation keys.
- Dynamic strings: `App.t('key')`.

**Canvas caveat**: for `<canvas>` text, detect Arabic with `/^[\s\W\d]*[\u0600-\u06FF]/`, then set `ctx.direction = 'rtl'` and an Arabic font stack (`'IBM Plex Sans Arabic'`).

## `state.js` — State Store

Holds `translations`, `nav`, and `currentLang`; single source of truth shared by App, I18n, and BaseTool.

## `ui.js` — Global UI Utilities

- **Theme**: `initTheme()` (dark-first, prevents flash), `setTheme(theme)`, `toggleTheme()`.
- **Native Dialogs**:
  - `UI.confirm(message, { confirmText, cancelText, danger }) → Promise<boolean>`: dynamic `<dialog>` opened with `showModal()`, `<form method="dialog">`, `closedby="any"` (with pointer backdrop-click fallback), Esc close, RTL-safe Tailwind layout, I18n strings, and focus restoration to the opener.
  - `UI.prompt(message, defaultValue, { placeholder, confirmText, cancelText }) → Promise<string | null>`: dynamic `<dialog>` with text `<input>`, submits `'confirm'` on Enter, resolves `null` on Cancel/Esc/backdrop dismiss, restores focus.
- **Command Palette (`initCommandPalette()`)**: native `<dialog>` opened via `showModal()` (`closedby="any"` + backdrop fallback, Esc dismiss, focus restoration, `Ctrl/Cmd+K` shortcut, safe `Utils.h` result rendering, and `renderIcons(results)`).
- **Toast (`showToast(msg, opts)`)**: accepts numeric `duration`, `'info' | 'success' | 'error'` string, or `{ type, duration }`; clears any active timer before scheduling; toggles `role="alert"` / `aria-live="assertive"` for errors and `role="status"` / `aria-live="polite"` otherwise; supports native `popover="manual"` (`showPopover()`/`hidePopover()`) when `#toast` carries `[popover]`, falling back gracefully when absent.
- **Confetti (`async fireConfetti()`)**: lazily dynamically imports `canvas-confetti` unless `prefers-reduced-motion: reduce` matches (also sets `disableForReducedMotion: true`), handling load failures via `showToast(..., { type: 'error' })`.

## `utils.js` — Helpers

- **Task Yielding**:
  - `Utils.yieldToMain()`: returns `scheduler.yield()` when supported, falling back to `setTimeout(..., 0)`.
  - `Utils.createYielder(budgetMs = 50)`: returns `async maybeYield()` that yields only once `performance.now()` exceeds `budgetMs` since the last yield.
- **Safe DOM Builder**:
  - `Utils.h(tag, props = {}, ...children)`: creates elements without `innerHTML`; supports `class`/`className`, `dataset`, `attrs` (via `setAttribute`), `on` (`addEventListener`), `text` (`textContent`), `style`, and safe element attributes; children may be strings/numbers (converted to text nodes), `Node`s, arrays, or `null`/`undefined`/booleans.
- **ZIP Export**: `async downloadZip(files, filename)` lazily dynamically imports `jszip` on demand and surfaces failures via `App.showToast(..., { type: 'error' })`.
- **Other Helpers**: `copyToClipboard()` (preserving child icon nodes without `innerHTML`), `downloadFile()`, `formatSize()`, `escapeCSV()`, `escapeHtml()`, `htmlToMarkdown()`, `isArabic()`.

