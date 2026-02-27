# WPToolbox Project Guidelines

This document outlines the architecture, standards, and development workflow for the **WPToolbox** suite of WordPress utility tools.

## 🚀 Core Philosophy

1.  **Privacy First**: All data processing is done locally in the user's browser (Client-Side). No data leaves the machine.
2.  **Zero Dependencies (Build-wise)**: The project uses external CDNs for lightweight libraries (Tailwind, Lucide, Turndown) to avoid complex build steps while maintaining a high-performance profile.
3.  **Refined UX/UI**: Adheres to modern "Shadcn-inspired" aesthetics: clean typography (Inter), mono fonts for data (JetBrains Mono), and strictly **no animations** for ultimate snappiness.
4.  **Dark Only**: The application is built with a permanent dark theme.

---

## 🏗️ Project Structure

The project follows a strict **Separation of Concerns (SoC)** model.

### Directory Mapping
- `/css/`: Global design system and shared OKLCH CSS tokens.
- `/js/`: Modularized logic.
    - `core.js`: Shared utility object (`App`) for toasts, downloads, and centralized UI rendering (Navbar/Footer).
    - `snippets.json`: External storage for WordPress code snippets.
    - `*.js`: Tool-specific logic (e.g., `font-cleaner.js`, `snippets.js`).
- `/assets/`: Future location for static images or icons.
- `index.html`: The central hub/dashboard.
- `*.html`: Individual tool pages.

---

## 🛠️ Tech Stack & Standards

### Frontend
- **CSS**: Tailwind CSS (CDN). OKLCH color system defined in `css/globals.css`. 
- **Icons**: Lucide Icons (CDN). 
- **Fonts**: `Inter` (UI) and `JetBrains Mono` (Code) via Google Fonts.

### JavaScript Standards
1.  **Module Pattern**: Each tool's logic is encapsulated in a global object.
2.  **Dynamic Rendering**: Navbar and Footer are generated via `App.renderNavbar()` to ensure consistency.
3.  **External Data**: Content-heavy modules (like Snippets) fetch data from external JSON files to keep logic files light.

---

## ➕ Adding a New Snippet

To add a new snippet to the library:
1. Open `js/snippets.json`.
2. Add a new object to the array with `id`, `category`, `title`, `description`, `code`, and `language`.
3. The UI will automatically detect and render the new entry.

---

## ➕ Adding a New Tool

To add a new utility to the hub:
1.  **Create Logic**: Create `js/new-tool.js`.
2.  **Create Template**: Duplicate `json2csv.html`.
3.  **Update Hub**: Add a tool card to `index.html`.
4.  **Update Navigation**: Add the link to the `links` array in `js/core.js`.

---

## 📦 Deployment & Development

- **Server**: You **MUST** run a local server (e.g., `python3 -m http.server` or live server) to allow JavaScript to fetch `snippets.json`.

---
*Maintained by the WPToolbox development team.*
