# Developer Reference Tools (`nav_group_dev`)

Three developer utilities and reference tools backed by multilingual JSON databases and client-side parsers.

## Snippets Library — `snippets.js` → `snippets.html`
- Browsable WordPress code snippets from `src/data/snippets.json` with custom snippet creation, editing, favorites, search, category filtering (`#categories`), and JSON import/export (`localStorage`).
- Cards render safely via `App.h` (text nodes for titles, descriptions, categories, and `<code>` blocks—preventing stored XSS), inside a `wpt-deferred` grid.
- Add/edit modal (`#snippet-modal`) uses native `<dialog class="wpt-dialog" closedby="any">`; deletions confirm via `await App.confirm(...)`.
- Copy-to-clipboard via `App.copyToClipboard(...)`; monospace rendering with JetBrains Mono.

## WP Export Mapper — `wp-mapper.js` → `wp-mapper.html`
- Parses CSV (RFC4180 quote-aware parser), JSON, or WordPress WXR/XML (`DOMParser` with `parsererror` + `.length` check) files and maps columns to WordPress post fields (`post_title`, `post_content`, `post_excerpt`, `post_status`, `post_type`, `post_date`, `category`, `post_tag`, `meta_key`, `ignore`).
- Converts Markdown content via `marked` + `DOMPurify`, tracks HTML-to-Markdown toggle (`#markdown-toggle` with `role="switch"` + `aria-checked`), escapes CDATA boundaries (`]]>` split into `]]]]><![CDATA[>`), and yields via `App.createYielder(50)` during export generation with native `<dialog>` `#processing-overlay`.
- Field mapping rows render via `App.h`; exports a WXR `.xml` file via `App.downloadFile`.

## Tips & Facts — `tips.js` → `tips.html`
- WordPress tips from `src/data/tips.json`; each entry carries localized fields resolved through the I18n helper (object-or-string lookup) and re-renders on `languageChanged`.
- Cards render safely as `<article>` elements via `App.h` inside a `wpt-deferred` grid with scoped Lucide icons (`createIcons({ icons, root })`).
