# Getting Started

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Build tool | Vite (multi-page app) | ^7.3.1 |
| Styling | Tailwind CSS via `@tailwindcss/vite` plugin | ^4.2.1 |
| Language | Vanilla ES modules (no framework) | — |
| PWA | `vite-plugin-pwa` (Workbox, autoUpdate) | ^1.2.0 |
| Libraries | `jszip`, `qrcode`, `canvas-confetti`, `lucide` | latest |
| Runtime | Bun (CI) or npm locally | — |

## Project Layout

```
/                       Root: 15 tool HTML entry points + vite.config.js
├── src/
│   ├── main.js         Entry point: boots App, loads styles + components
│   ├── home.js         Home page logic
│   ├── core/           Framework: app.js, base-tool.js, i18n.js, state.js, ui.js, utils.js
│   ├── tools/          One module per tool (15 files)
│   ├── components/     Web Components: navbar.js, footer.js
│   ├── data/           JSON databases: translations, nav, tips, snippets, stack-config, checklist-data
│   └── styles/         main.css (Tailwind 4 @theme) + globals.css (OKLCH variables)
├── public/             Static assets copied verbatim (favicon.svg, js/data/*.json)
├── dist/               Build output (committed; deployed to GitHub Pages)
└── .github/workflows/deploy.yml   CI: bun install → bun run build → Pages deploy
```

## Run in Development

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev  → http://localhost:3000
```

The Vite dev server runs on port **3000** (`server.port` in `vite.config.js`). Every root-level `.html` file is auto-discovered as a Rollup input — adding a new page requires only a new HTML file plus a tool module.

## Build & Preview

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

## Testing

```bash
npm run test:unit  # Vitest unit tests + bundle-size check (when dist/ exists)
npm run test:e2e   # Playwright Chromium smoke & tool flow tests against vite preview
npm run check      # Build + CSP hash check + unit tests
```

See [Testing Guide](testing.md) for suite details, hermetic E2E setup, and CI workflows.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) deploys `dist/` to **GitHub Pages** on every push to `main`/`master`: checkout → setup-bun → `bun install` → `bun run build` → upload-pages-artifact.

## Adding a New Tool

1. Create `tool-name.html` at the project root keeping `<html lang="en" style="background-color: #09090b; color: white;">` and shrinking `<head>` to only the shared injection marker plus the page's module entry:
   ```html
   <head>
       <!-- wpt:head -->
       <script type="module" src="src/tools/tool-name.js"></script>
   </head>
   ```
   (Do not duplicate charset, CSP, GTM, fonts, or meta tags — `src/build/head-plugin.js` injects them automatically.)
2. Add an entry keyed by `"tool-name.html"` to `src/data/pages.json` with `title`, `description`, and any optional SEO/Open Graph/Twitter fields (`titleI18n`, `canonicalPath`, `ogType`, `ogTitle`, `ogDescription`, `ogImage`, `twitterCard`, `twitterSite`). Builds fail loudly if an HTML page lacks a `pages.json` entry or the `<!-- wpt:head -->` marker.
3. Create `src/tools/tool-name.js` and register it:
   ```js
   import { App } from '../core/app.js';
   export const MyTool = App.registerTool('MyTool', {
       onInit() { /* ... */ }
   });
   ```
4. Add a navigation entry to `src/data/nav.json` and all UI + meta translations (`en` and `ar`, including `title_*` and `desc_*` keys) to `src/data/translations.json`.
5. Run `npm run build && npm run check:csp` to verify the build and CSP hashes, and follow `docs/design-guidelines.md` for styling and i18n rules.
