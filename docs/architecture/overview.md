# Architecture Overview

## Module Graph

```mermaid
flowchart TD
    HTML["Root *.html pages (15)"] --> main["src/main.js"]
    main --> App["core/app.js (App facade)"]
    main --> Styles["styles/main.css → Tailwind 4"]
    main --> Nav["components/navbar.js (wpt-navbar)"]
    main --> Footer["components/footer.js (wpt-footer)"]

    App --> State["core/state.js"]
    App --> I18n["core/i18n.js"]
    App --> UI["core/ui.js"]
    App --> Utils["core/utils.js"]
    App --> BaseTool["core/base-tool.js"]

    Tools["src/tools/*.js (15 modules)"] -->|"App.registerTool()"| BaseTool
    BaseTool --> State
    BaseTool --> I18n
    UI --> Utils

    Data["src/data/*.json"] --> State
    Lucide["lucide icons"] --> App
```

## Boot Sequence (`App.init()`)

1. `UI.initTheme()` — runs first to prevent light-mode flash.
2. `I18n.updateDirection()` — sets `<html dir>` / `lang` (`ar` → RTL).
3. Translations loaded into `State`; DOM strings applied via `data-i18n*` attributes.
4. `App.isReady = true` and the global **`appReady`** event is dispatched on `window`.

Tools must wait for `App.isReady` or the `appReady` event before touching translated DOM.

## Tool Registration Pattern

`App.registerTool(id, config)` wraps config in a `BaseTool` instance and stores it in `App.tools`. `BaseTool` wires shared file-handling UI by convention (default element IDs, overridable via config):

| Config key | Default ID | Purpose |
|---|---|---|
| `dropZoneId` | `drop-zone` | Drag & drop target |
| `fileInputId` | `file-input` | File picker |
| `progressBarId` | `progress-bar` | Progress bar |
| `progressStatusId` | `progress-status` | Status text |
| `processedCountId` | `processed-count` | Counter |
| `overlayId` | `processing-overlay` | Processing overlay |
| `cancelBtnId` | `cancel-btn` | Cancel button |
| `resultsId` | `results-section` | Results container |
| `multiple` | `false` | Multi-file support |

Drop-zone highlight uses `border-primary bg-primary/5` classes during dragover.

## Data Schema

All content lives in versioned JSON under `src/data/`:

```mermaid
erDiagram
    NAV_JSON ||--o{ GROUP : "groups[]"
    GROUP ||--o{ ITEM : "items[]"
    ITEM { string href  "page.html"
           string text  "i18n key"
           string icon  "lucide name"
           string desc  "i18n key" }

    TRANSLATIONS_JSON ||--|| EN : "en"
    TRANSLATIONS_JSON ||--|| AR : "ar"

    TIPS_JSON ||--o{ TIP : "list (multilingual objects)"
    SNIPPETS_JSON ||--o{ SNIPPET : "list (~10 snippets)"
    CHECKLIST_DATA_JSON ||--o{ TASK : "13 deployment tasks"
    STACK_CONFIG_JSON ||--o{ STACK_OPTION : "stack presets"
```

- **translations.json** — flat key→string maps per locale; page meta uses `title_<page>` / `desc_<page>` keys.
- **nav.json** — three groups: `nav_group_media`, `nav_group_workflow`, `nav_group_dev`.
- **tips.json / snippets.json** — each entry carries both `en` and `ar` variants.
- Duplicated copies exist in `public/js/data/` for legacy/static fallback; `src/data/` is the source of truth.

## Build Pipeline

`vite.config.js`:
- Scans root `*.html` files → Rollup multi-page inputs.
- `base: './'` for relative asset URLs (Pages-friendly).
- Tailwind via `@tailwindcss/vite`.
- PWA: autoUpdate service worker, manifest named *WPToolbox*, theme `#09090b`, SVG favicon at 192/512.
