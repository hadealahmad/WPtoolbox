# Core Framework (`src/core/`)

## `app.js` — Application Facade

Singleton `App` object exposing:
- **State accessors**: `App.translations`, `App.currentLang` (proxied to `State`).
- **Registry**: `App.tools` map + `App.registerTool(id, config)` → instantiates `BaseTool` and fires `tool_view`.
- **Analytics & Consent**: `App.track(eventName, params)`, `App.setConsent(level)`, `App.getConsent()`.
- **UI**: `App.showToast(msg, opts)`, `App.confirm(message, opts)`, `App.prompt(message, defaultValue, opts)`, `App.fireConfetti()`.
- **Utilities**: `App.yieldToMain()`, `App.createYielder(budgetMs)`, `App.h(tag, props, ...children)`, `App.escapeCSV`, `App.escapeHtml`, `App.htmlToMarkdown`, `App.formatSize`, `App.downloadFile`, `App.downloadZip`, `App.copyToClipboard`.
- **Lifecycle**: async `init()` (idempotent via `isReady`), initializes `Analytics` outbound link tracking and dispatches `appReady`.
- Icon rendering via `lucide` (`createIcons`, `icons`).

## `analytics.js` — GTM & Consent Mode v2

Privacy-safe Google Tag Manager (`dataLayer`) wrapper and Consent Mode v2 manager:
- `track(eventName, params = {})`: pushes `{ event: eventName, ...params }` to `window.dataLayer` (no-op safe if `dataLayer` is missing).
- `getConsent()`: reads `'denied' | 'granted' | 'all' | null` from `localStorage` key `'wpt-consent'`.
- `setConsent(level)`: persists `'denied' | 'granted' | 'all'`, calls `gtag('consent', 'update', ...)`, pushes `consent_update`, and dispatches `consentChanged`.
- `init()`: binds a single delegated document click listener for `outbound_click` on external links.

See [docs/analytics.md](../analytics.md) for the complete event catalog and consent flow.

## `base-tool.js` — BaseTool Class

Shared plumbing for every tool: file drop zone + input wiring, progress bar/status/count updates, processing overlay with cancel button, results section reveal, and `processInChunks()` yielding via `Utils.yieldToMain()`. Tools configure element IDs through the config object (see overview table). Convention: initial logic goes in the `onInit` hook.

## `i18n.js` — Internationalization Engine

- Applies translations to DOM: `data-i18n` (text), `data-i18n-html` (rich content — first-party trust boundary backed solely by bundled `src/data/translations.json`), `data-i18n-placeholder` (inputs).
- `updateDirection()`: sets `dir="rtl"` and `lang="ar"` when Arabic is active.
- Per-page SEO metadata from `title_<pageKey>` / `desc_<pageKey>` translation keys.
- Dynamic strings: `App.t('key')`.
- Emits `language_change` on `languageChanged`.

**Canvas caveat**: for `<canvas>` text, detect Arabic with `/^[\s\W\d]*[\u0600-\u06FF]/`, then set `ctx.direction = 'rtl'` and an Arabic font stack (`'IBM Plex Sans Arabic'`).

## `state.js` — State Store

Holds `translations` and `currentLang`; single source of truth shared by App, I18n, and BaseTool.

## `ui.js` — Global UI Utilities

- **Theme**: `initTheme()` (dark-first, prevents flash), `setTheme(theme)`, `toggleTheme()`.
- **Native Dialogs**:
  - `UI.confirm(message, { confirmText, cancelText, danger }) → Promise<boolean>`: dynamic `<dialog>` opened with `showModal()`, `<form method="dialog">`, `closedby="any"` (with pointer backdrop-click fallback), Esc close, RTL-safe Tailwind layout, I18n strings, and focus restoration to the opener.
  - `UI.prompt(message, defaultValue, { placeholder, confirmText, cancelText }) → Promise<string | null>`: dynamic `<dialog>` with text `<input>`, submits `'confirm'` on Enter, resolves `null` on Cancel/Esc/backdrop dismiss, restores focus.
- **Command Palette (`initCommandPalette()`)**: native `<dialog>` opened via `showModal()` (`closedby="any"` + backdrop fallback, Esc dismiss, focus restoration, `Ctrl/Cmd+K` shortcut, safe `Utils.h` result rendering, `createIcons({ root: results })`, and `command_palette_open` / `command_palette_select` analytics).
- **Toast (`showToast(msg, opts)`)**: accepts numeric `duration`, `'info' | 'success' | 'error'` string, or `{ type, duration }`; clears any active timer before scheduling; toggles `role="alert"` / `aria-live="assertive"` for errors and `role="status"` / `aria-live="polite"` otherwise; supports native `popover="manual"` (`showPopover()`/`hidePopover()`) when `#toast` carries `[popover]`, falling back gracefully when absent.
- **Confetti (`fireConfetti()`)**: triggers `canvas-confetti` unless `prefers-reduced-motion: reduce` matches (also sets `disableForReducedMotion: true`).

## `utils.js` — Helpers

- **Task Yielding**:
  - `Utils.yieldToMain()`: returns `scheduler.yield()` when supported, falling back to `setTimeout(..., 0)`.
  - `Utils.createYielder(budgetMs = 50)`: returns `async maybeYield()` that yields only once `performance.now()` exceeds `budgetMs` since the last yield.
- **Safe DOM Builder**:
  - `Utils.h(tag, props = {}, ...children)`: creates elements without `innerHTML`; supports `class`/`className`, `dataset`, `attrs` (via `setAttribute`), `on` (`addEventListener`), `text` (`textContent`), `style`, and safe element attributes; children may be strings/numbers (converted to text nodes), `Node`s, arrays, or `null`/`undefined`/booleans.
- **Other Helpers**: `copyToClipboard()` (preserving child icon nodes without `innerHTML`, tracking `copy_to_clipboard`), `downloadFile()`, `downloadZip()`, `formatSize()`, `escapeCSV()`, `escapeHtml()`, `htmlToMarkdown()`, `isArabic()`.

