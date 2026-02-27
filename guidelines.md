# WPToolbox Project Guidelines

This document outlines the architecture, design principles, and technical standards for the WPToolbox project.

## 🏗 Project Structure

- **`/` (Root)**: Contains all tool HTML pages (e.g., `index.html`, `awesomestack.html`, `img2webp.html`).
- **`/js/`**:
  - `core.js`: Global logic, navigation rendering, footer, and clipboard utilities.
  - `snippets.js`: Logic for loading and filtering the snippets library.
  - `snippets.json`: Externalized database for all code snippets.
  - `awesome-stack.js`: Logic for WP-CLI command generation and interactive selection UI.
  - `image-converter.js`: Client-side WebP conversion logic using Canvas API.
- **`/css/`**: Global styles and theme definitions.
- **`/assets/`**: Logos and social sharing images.

## � Design & Aesthetic Standards

The project follows a **strict Dark-Only Shadcn-inspired theme**.
- **Colors**: Uses OKLCH color space for premium, uniform dark mode aesthetics.
- **Typography**: Inter for interface text, JetBrains Mono for code blocks.
- **Components**: Custom implementaitons of Shadcn patterns (Checkboxes, Cards, Buttons, Toasts).
- **Animations**: Disabled for instant, professional UI feedback.
- **Privacy**: No external tracking. All data processing must happen client-side.

## 🔍 SEO & Social Integration

Every page is integrated with comprehensive meta tags to ensure professional indexing and social sharing:
- **Meta Description**: Custom descriptions for every specific tool.
- **Open Graph (OG)**: Standardized for Facebook, LinkedIn, and Discord, referencing tool-specific URLs.
- **Twitter Cards**: Optimized for X with `@hadealahmad` site attribution and `summary_large_image` cards.

## 🛠 Coding Standards

1. **Modularity**: New tools should have their own isolated JS file in `/js/`.
2. **Global Components**: Navigation and footer must be rendered via `App.init()` in `core.js`.
3. **Escaping**: All code snippets must be HTML-escaped before injection to prevent browser parsing of tags.
4. **Clipboard**: Use the `App.copyToClipboard` utility which includes an automatic fallback for non-secure/local environments.
5. **JSON Data**: Keep the `snippets.json` file structured with `id`, `category`, `title`, `description`, and `code` keys.

---
*Last Updated: February 2026*
