# WPToolbox Project Guidelines

This document outlines the architecture, design principles, and technical standards for the WPToolbox project.

## 🏗 Project Structure (Vite-Powered)

The project uses a modern modular architecture powered by **Vite**.

- **`/` (Root)**: Contains tool-specific HTML templates (e.g., `index.html`, `svg-sanitizer.html`).
- **`/src/core/`**: Core framework logic.
  - `app.js`: Main application facade and lifecycle management.
  - `i18n.js`: Internationalization engine with MutationObserver support.
  - `base-tool.js`: Base class for all tools providing shared file handling and progress logic.
  - `ui.js`: Global UI utilities (theme, toasts, confetti).
  - `utils.js`: Helper functions (clipboard, download, formatting).
- **`/src/tools/`**: Tool-specific modules (e.g., `wp-cli-builder.js`, `image-converter.js`).
- **`/src/components/`**: Reusable Web Components (`wpt-navbar`, `wpt-footer`).
- **`/src/data/`**: Centralized data storage.
  - `translations.json`: Dictionary for all UI strings.
  - `nav.json`: Categorized navigation structure.
  - `tips.json` & `snippets.json`: Multilingual content databases.
- **`/src/styles/`**: Tailwind CSS 4 styling via `@tailwindcss/vite`; `main.css` defines `@theme` tokens (`--color-primary`, `--color-primary-foreground`) and imports `globals.css` with OKLCH variables, top-layer styles, and custom utilities (legacy `tailwind.config.js` and `css/style.css` have been removed).
- **`/dist/`**: Build output (gitignored; built in CI and deployed to GitHub Pages).

## 🎨 Design & Aesthetic Standards

The project follows a **Premium Dark Shadcn-inspired theme**.

- **Colors & Theme**: Strictly uses the **OKLCH** color space for vibrant, consistent dark mode aesthetics (`color-scheme: dark` on `:root`). Primary: `oklch(0.488 0.243 264.376)`; surfaces use the zinc scale (`zinc-950` inputs, `zinc-800` borders, `zinc-300` labels) on a `#09090b` base. Use `color-mix(in oklch, var(--primary) 30%, transparent)` when applying alpha to OKLCH custom properties (never `rgba(var(--...), ...)`).
- **Scrollbars**: Standard `scrollbar-color: var(--muted-foreground) transparent` and `scrollbar-width: auto` on `:root`, with legacy `::-webkit-scrollbar*` rules scoped inside `@supports not (scrollbar-color: auto)`.
- **Motion & Reduced Motion**: Transitions are scoped to interactive elements (`a`, `button`, `input`, `select`, `textarea`, `.tool-card`, `.task-item`) rather than a global `*` override. Spatial hover transforms and non-essential motion are gated inside `@media (prefers-reduced-motion: no-preference)`. Loading spinners (`.animate-spin`) stay active as essential feedback and slow to `6s` under `@media (prefers-reduced-motion: reduce)`.
- **Top-Layer Dialogs & Popovers**:
  - `.wpt-dialog`: Opt-in UA reset for native `<dialog>` modals (clears default border/padding/background/max-size while keeping `margin: auto` centering). `dialog::backdrop` provides the dark blurred overlay (`rgb(0 0 0 / 0.8)` + `blur(8px)`).
  - `.wpt-popover`: Opt-in UA reset for `[popover]` elements (clears default border/padding/background/`inset`/`margin`).
  - `dialog` and `[popover]` share entry/exit transitions via `@starting-style`, `overlay`, `display`, and `transition-behavior: allow-discrete` inside `@media (prefers-reduced-motion: no-preference)` (with `:where(:not([data-closing]))` exit support).
- **Performance & Form Utilities**:
  - `.wpt-deferred`: Apply to long card/result grids so `.wpt-deferred > *` defers off-screen layout/paint via `content-visibility: auto; contain-intrinsic-size: auto 280px;`.
  - **Post-Interaction Validation**: Textual `<input>` (excluding `range`, `checkbox`, `radio`, `file`), `<textarea>`, and `<select>` elements style `:user-invalid` (`--destructive`) and constrained `:user-valid` states automatically.
  - **Textareas & Inputs**: Shared `builder-input` class for form controls; `<textarea>` defaults to `resize: vertical` unless `.resize-none` is explicitly applied; toggles built with Tailwind peer classes (`peer-checked:bg-primary`) or native switches.
- **Typography**: 
  - **Interface**: Inter (Latin) and IBM Plex Sans Arabic (Arabic).
  - **Code**: JetBrains Mono for all monospaced elements.
  - **Font Fallback Stability**: `body` and monospaced elements (`code`, `pre`, `kbd`, `samp`, `.font-mono`) use `font-size-adjust: from-font` to minimize layout shift during web-font swaps.
- **Visuals**: Incorporates glassmorphism, subtle micro-animations, and smooth transitions for a high-end feel.
- **RTL Support**: Native Right-to-Left compatibility using Tailwind CSS **Logical Properties** (e.g., `ms-*`, `inline-start`).
- **PWA Ready**: Integrated service worker for offline capabilities and caching.

## 🔍 SEO & Social Integration

Every page includes professional meta-integration:
- **Unique Metadata**: Tool-specific `title` and `description` via the I18n engine.
- **Open Graph (OG)**: Optimized for Facebook, LinkedIn, and Discord.
- **Twitter Cards**: High-impact `summary_large_image` cards.

## 🛠 Coding Standards

1. **Tool Registration**: 
   - All new tools must register via `App.registerTool(id, config)` (wrapped in `BaseTool`).
   - Initial logic should be placed in the `onInit` hook.
   - New pages: add a root `*.html` file — Vite auto-discovers it as a build input.
2. **Localization (I18n)**:
   - Use `data-i18n` for text, `data-i18n-html` for rich content, and `data-i18n-placeholder` for inputs.
   - Use `App.t('key')` for dynamic strings.
   - Always provide translations in both `en` and `ar` within `translations.json`.
   - **Canvas APIs**: When drawing text dynamically to a `<canvas>`, use regex (e.g. `/^[\s\W\d]*[\u0600-\u06FF]/`) to detect Arabic text and manually set `ctx.direction = 'rtl'` and use an appropriate font stack (e.g. `'IBM Plex Sans Arabic'`).
3. **Components**:
   - Use Custom Elements (Web Components) for global UI parts like navigation and footers to ensure encapsulation and ease of maintenance.
4. **Lifecycle**:
   - Check `App.isReady` or listen for the `appReady` event before running DOM-dependent logic to ensure translations are loaded.
5. **Privacy**: 
   - Zero-server processing. All data must be handled client-side using Blobs, DataURLs, or browser-based workers.

---
*Last Updated: August 2026*
*See also: [getting-started.md](getting-started.md) · [architecture/overview.md](architecture/overview.md)*
