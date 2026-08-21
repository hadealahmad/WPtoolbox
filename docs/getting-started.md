# Getting Started

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Build tool | Vite (multi-page app) | ^7.3.1 |
| Styling | Tailwind CSS via `@tailwindcss/vite` plugin | ^4.2.1 |
| Language | Vanilla ES modules (no framework) | — |
| PWA | `vite-plugin-pwa` (Workbox, autoUpdate) | ^1.2.0 |
| Libraries | `jszip`, `qrcode`, `canvas-confetti`, `lucide` / `lucide-static` | latest |
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

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) deploys `dist/` to **GitHub Pages** on every push to `main`/`master`: checkout → setup-bun → `bun install` → `bun run build` → upload-pages-artifact.

## Adding a New Tool

1. Create `tool-name.html` at the project root (copy an existing page's skeleton; include `<script type="module" src="/src/main.js">`).
2. Create `src/tools/tool-name.js` and register it:
   ```js
   import { App } from '../core/app.js';
   export const MyTool = App.registerTool('MyTool', {
       onInit() { /* ... */ }
   });
   ```
3. Add nav entry to `src/data/nav.json` and all strings (en + ar) to `src/data/translations.json`.
4. Follow `docs/design-guidelines.md` for styling and i18n rules.
