# WPToolbox Project Guidelines

This document outlines the architecture, design principles, and technical standards for the WPToolbox project.

## 🏗 Project Structure

- **`/` (Root)**: Contains all tool HTML pages (e.g., `index.html`, `awesomestack.html`, `img2webp.html`).
- **`/js/`**:
  - `core.js`: Global logic, i18n engine, navigation rendering, and clipboard utilities.
  - `translations.json`: Centralized dictionary for all translatable UI strings.
  - `snippets.js`: Logic for loading and filtering the multilingual snippets library.
  - `snippets.json`: Multilingual database for all code snippets.
  - `tips.js`: Logic for the multilingual Tips & Facts engine.
  - `tips.json`: Multilingual database for WordPress tips.
- **`/css/`**: Global styles and theme definitions.
- **`/assets/`**: Logos and social sharing images.

## 🎨 Design & Aesthetic Standards

The project follows a **strict Dark-Only Shadcn-inspired theme**.
- **Colors**: Uses OKLCH color space for premium, uniform dark mode aesthetics.
- **Typography**: 
  - **English**: Inter for interface text.
  - **Arabic**: IBM Plex Sans Arabic for interface text.
  - **Code**: JetBrains Mono for code blocks.
- **RTL Support**: Full Right-to-Left compatibility using Tailwind CSS **Logical Properties** (e.g., `ms-*`, `pe-*`, `text-start`). Use of physical properties (left/right) is forbidden.
- **Components**: Custom implementations of Shadcn patterns (Checkboxes, Cards, Buttons, Toasts).
- **Animations**: Disabled for instant, professional UI feedback.
- **Privacy**: No external tracking. All data processing must happen client-side.

## 🔍 SEO & Social Integration

Every page is integrated with comprehensive meta tags to ensure professional indexing and social sharing:
- **Meta Description**: Custom descriptions for every specific tool.
- **Open Graph (OG)**: Standardized for Facebook, LinkedIn, and Discord, referencing tool-specific URLs.
- **Twitter Cards**: Optimized for X with `@hadealahmad` site attribution and `summary_large_image` cards.

## 🛠 Coding Standards

1. **Localization (i18n)**:
   - Use the `data-i18n` attribute on HTML elements for static UI strings.
   - Use `App.t('key')` in JavaScript for dynamic strings.
   - For JSON databases, use `{ "en": "...", "ar": "..." }` objects for translatable fields.
2. **Modularity**: New tools should have their own isolated JS file in `/js/`.
3. **Global Components**: Navigation and footer must be rendered via `App.init()` in `core.js`.
4. **Escaping**: All code snippets must be HTML-escaped before injection to prevent browser parsing of tags.
5. **Clipboard**: Use the `App.copyToClipboard` utility which includes an automatic fallback for non-secure/local environments.

---
*Last Updated: February 2026*
