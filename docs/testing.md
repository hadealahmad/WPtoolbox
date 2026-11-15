# Testing Guide

WPToolbox uses **Vitest** (`happy-dom`) for fast unit and integrity checks and **Playwright** (Chromium) for end-to-end verification against the production `vite preview` bundle.

## Commands

| Script | Purpose |
|---|---|
| `npm test` / `npm run test:unit` | Run all Vitest unit tests (`tests/unit/**/*.test.js`) and the bundle-size budget check (`tests/bundle-size.test.js` when `dist/assets/` exists) |
| `npm run test:e2e` | Run Playwright Chromium E2E tests (`tests/e2e/*.spec.js`) against `vite preview` on port `4173` |
| `npm run check:csp` | Verify inline Consent Mode v2 script SHA-256 hashes across all 16 root `*.html` files (and `dist/` if built) |
| `npm run check` | Full local pre-flight: `vite build && node scripts/check-csp-hash.mjs && vitest run` |

> First-time E2E setup requires Chromium installed for Playwright: `npx playwright install chromium` (or `npx playwright install --with-deps chromium` on Linux/CI).

## Test Suites

### Unit & Integrity Tests (`tests/unit/` + `tests/bundle-size.test.js`)

- **`tests/unit/svg-sanitizer.test.js`** — Table-driven tests for `sanitizeSVGMarkup` (`src/tools/svg-sanitizer.js`): strips `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, `on*` handlers, unsafe `href`/`xlink:href`, dangerous `<animate>`/`<set>` targets, and external/unsafe CSS `url()` in `style` / `<style>`, while preserving normal icons and safe `#id` fragments.
- **`tests/unit/utils.test.js`** — Tests `Utils.escapeCSV`, `Utils.escapeHtml`, `Utils.htmlToMarkdown`, `Utils.formatSize`, `Utils.createYielder` (fake timers + mocked `performance.now()`), and `Utils.h()` (XSS-safe text node creation, ignored `innerHTML`/`outerHTML`).
- **`tests/unit/tools-validation.test.js`** — Covers `WPMapper` (`parseCSV` RFC4180 incl. embedded newlines/BOM/CRLF, `escapeCData`, `generateWXRPace`), `DemoGenerator` (`escapeCData`, `exportToCSV`, `exportToXML`), `BlocksyPalette` direct validators (`safeHex`, `sanitizePaletteColors`, `parseColorInput`) + `getSaved()` / `onTextInput()`, and `Checklist` direct validators (`getSafeHttpUrl`, `sanitizeImportedSites`) + `confirmAddSite()` / `renderChecklist()`.
- **`tests/unit/translations.test.js`** — Enforces `src/data/translations.json` integrity (`en` / `ar` key symmetry, non-empty strings, `nav.json` coverage, and key references across root `*.html` and `src/`).
- **`tests/bundle-size.test.js`** — Reads `dist/assets/*.js` and `dist/*.html` when built (`describe.runIf(hasDistAssets)`) and enforces four raw budgets: shared `main-*.js` ≤ 80 KiB, each per-page entry chunk ≤ 40 KiB, any single chunk ≤ 120 KiB, and initial JS per page (entry + `modulepreload` static imports) ≤ 150 KiB.

### E2E Smoke & Tool Flows (`tests/e2e/`)

- **`tests/e2e/smoke.spec.js`** — Visits every root `*.html` page served by `vite preview`, aborts external analytics/font network calls (`googletagmanager.com`, `google-analytics.com`, `fonts.*`) for hermetic runs, asserts zero console/page errors and zero `securitypolicyviolation` events, verifies no unrendered `i[data-lucide]` placeholders remain, confirms the `<wpt-consent>` Reject button persists `denied` across reloads, and tests `Ctrl+K` / `Escape` on the command palette.
- **`tests/e2e/tools.spec.js`** — Exercises one main flow for each of the 15 tools (including PNG → WebP download, malicious SVG sanitization download, QR ZIP download, Snippets add/delete with `App.confirm`, Checklist site creation, WP Mapper CSV → WXR, Demo Generator 10 records, WP-CLI & Server Config output, Unify Aspect Ratio, Clear Fonts, Blocksy Palette, Dummy Image ZIP, Awesome Stack, and Tips) plus stored-XSS reload checks in Snippets and Checklist.

## CI Workflows

- **`.github/workflows/ci.yml`** — Runs `bun install`, `bun run build`, `bun run check:csp`, `bun run test:unit`, and `bun run test:e2e` on `pull_request` to `main`/`master`, uploading `playwright-report/` on failure.
- **`.github/workflows/deploy.yml`** — Runs the same `test` job on `push` to `main`/`master` and gates the GitHub Pages `deploy` job (`needs: test`) to `push` on `main`.
