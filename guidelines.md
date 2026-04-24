# WPToolbox Project Guidelines

This document outlines the architecture, design principles, and technical standards for the WPToolbox project.

## 🏗 Project Structure (Vite-Powered)

The project uses a modern modular architecture powered by **Vite**.

- **`/` (Root)**: Contains tool-specific HTML templates (e.g., `index.html`, `awesomestack.html`).
- **`/src/core/`**: Core framework logic.
  - `app.js`: Main application facade and lifecycle management.
  - `i18n.js`: Internationalization engine with MutationObserver support.
  - `base-tool.js`: Base class for all tools providing shared file handling and progress logic.
  - `ui.js`: Global UI utilities (theme, toasts, confetti).
  - `utils.js`: Helper functions (clipboard, download, formatting).
- **`/src/tools/`**: Tool-specific modules (e.g., `awesome-stack.js`, `image-converter.js`).
- **`/src/components/`**: Reusable Web Components (`wpt-navbar`, `wpt-footer`).
- **`/src/data/`**: Centralized data storage.
  - `translations.json`: Dictionary for all UI strings.
  - `nav.json`: Categorized navigation structure.
  - `tips.json` & `snippets.json`: Multilingual content databases.
- **`/src/styles/`**: Tailwind CSS 4.0 styling with OKLCH color variables.

## 🎨 Design & Aesthetic Standards

The project follows a **Premium Dark Shadcn-inspired theme**.

- **Colors**: Strictly uses the **OKLCH** color space for vibrant, consistent dark mode aesthetics.
- **Typography**: 
  - **Interface**: Inter (Latin) and IBM Plex Sans Arabic (Arabic).
  - **Code**: JetBrains Mono for all monospaced elements.
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
   - All new tools must extend the `BaseTool` logic or use the `App.registerTool` API.
   - Initial logic should be placed in the `onInit` hook.
2. **Localization (I18n)**:
   - Use `data-i18n` for text, `data-i18n-html` for rich content, and `data-i18n-placeholder` for inputs.
   - Use `App.t('key')` for dynamic strings.
   - Always provide translations in both `en` and `ar` within `translations.json`.
3. **Components**:
   - Use Custom Elements (Web Components) for global UI parts like navigation and footers to ensure encapsulation and ease of maintenance.
4. **Lifecycle**:
   - Check `App.isReady` or listen for the `appReady` event before running DOM-dependent logic to ensure translations are loaded.
5. **Privacy**: 
   - Zero-server processing. All data must be handled client-side using Blobs, DataURLs, or browser-based workers.

---
*Last Updated: April 2026*
