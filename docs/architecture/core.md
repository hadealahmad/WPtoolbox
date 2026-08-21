# Core Framework (`src/core/`)

## `app.js` — Application Facade

Singleton `App` object exposing:
- **State accessors**: `App.translations`, `App.currentLang` (proxied to `State`).
- **Registry**: `App.tools` map + `App.registerTool(id, config)` → instantiates `BaseTool`.
- **Lifecycle**: async `init()` (idempotent via `isReady`), dispatches `appReady`.
- Icon rendering via `lucide` (`createIcons`, `icons`).

## `base-tool.js` — BaseTool Class

Shared plumbing for every tool: file drop zone + input wiring, progress bar/status/count updates, processing overlay with cancel button, results section reveal. Tools configure element IDs through the config object (see overview table). Convention: initial logic goes in the `onInit` hook.

## `i18n.js` — Internationalization Engine

- Applies translations to DOM: `data-i18n` (text), `data-i18n-html` (rich content), `data-i18n-placeholder` (inputs).
- `updateDirection()`: sets `dir="rtl"` and `lang="ar"` when Arabic is active.
- Per-page SEO metadata from `title_<pageKey>` / `desc_<pageKey>` translation keys.
- Dynamic strings: `App.t('key')`.

**Canvas caveat**: for `<canvas>` text, detect Arabic with `/^[\s\W\d]*[\u0600-\u06FF]/`, then set `ctx.direction = 'rtl'` and an Arabic font stack (`'IBM Plex Sans Arabic'`).

## `state.js` — State Store

Holds `translations` and `currentLang`; single source of truth shared by App, I18n, and BaseTool.

## `ui.js` — Global UI Utilities

Theme initialization (`initTheme()` — dark-first, prevents flash), toast notifications, confetti celebrations (`canvas-confetti`).

## `utils.js` — Helpers

Clipboard copy, file download, formatting utilities used across tools and UI.
