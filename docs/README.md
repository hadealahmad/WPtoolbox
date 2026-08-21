# WPToolbox Documentation

Premium WordPress utilities hub — a fully client-side, multi-page PWA built with Vite 7, Tailwind CSS 4, and vanilla JavaScript. Zero-server processing: every tool runs entirely in the browser.

## Documentation Map

```
docs/
├── README.md                  ← You are here (project map & feature matrix)
├── getting-started.md         ← Stack, dev setup, build & deploy
├── design-guidelines.md       ← Styling, theming, coding standards (moved from /guidelines.md)
├── architecture/
│   ├── overview.md            ← App facade, lifecycle, module graph, data schema
│   ├── core.md                ← src/core/ deep dive (App, BaseTool, I18n, State, UI, Utils)
│   └── components.md          ← Web Components (wpt-navbar, wpt-footer)
└── tools/
    ├── media.md               ← Media & asset tools
    ├── workflow.md            ← Deployment & workflow tools
    └── dev.md                 ← Developer reference tools
```

## Feature Matrix

All 15 registered tools (`src/tools/*.js`), grouped exactly as the navigation (`src/data/nav.json`):

### Media (`nav_group_media`)
| Tool | Module | Page | Description |
|---|---|---|---|
| Image to WebP | `image-converter.js` | `img2webp.html` | Batch canvas-based PNG/JPEG → WebP conversion with quality control |
| Unify Aspect Ratio | `unify-aspect-ratio.js` | `unify-aspect-ratio.html` | Normalize image dimensions to a single aspect ratio |
| QR Generator | `qr-generator.js` | `qr-generator.html` | QR code generation via the `qrcode` library |
| Font Cleaner | `clear-fonts.js` | `clearfonts.html` | Strip unused fonts from themes/plugins |
| Blocksy Palette | `blocksy-palette.js` | `blocksy-palette.html` | Full color palette + gradient generator with OKLCH support |
| SVG Sanitizer | `svg-sanitizer.js` | `svg-sanitizer.html` | Sanitize SVG uploads for safe WordPress use |
| Dummy Image Generator | `dummy-image-generator.js` | `dummy-image-generator.html` | Placeholder image generation |

### Workflow (`nav_group_workflow`)
| Tool | Module | Page | Description |
|---|---|---|---|
| Deployment Checklist | `checklist.js` + `src/data/checklist-data.json` (13 items) | `checklist.html` | Interactive WordPress deployment checklist |
| Demo Generator | `demo-generator.js` | `demo-generator.html` | Mock WordPress data: XML/WXR, CSV, and JSON export |
| Awesome Stack | `awesome-stack.js` + `src/data/stack-config.json` | `awesomestack.html` | Quick WordPress stack setup recommendations |
| Server Config Generator | `server-config-generator.js` | `server-config-generator.html` | Apache/Nginx config generation |
| WP-CLI Builder | `wp-cli-builder.js` | `wp-cli-builder.html` | Search-and-replace WP-CLI command builder (dry-run, GUID skip options) |

### Dev (`nav_group_dev`)
| Tool | Module | Page | Description |
|---|---|---|---|
| Snippets Library | `snippets.js` + `src/data/snippets.json` | `snippets.html` | Multilingual WordPress code snippet database |
| WP Export Mapper | `wp-mapper.js` | `wp-mapper.html` | WordPress export file mapping/analysis |
| Tips & Facts | `tips.js` + `src/data/tips.json` | `tips.html` | Multilingual WordPress tips database |

## Important Notes

- **Privacy-first**: no backend exists; all processing uses Blobs, DataURLs, and browser APIs.
- **Bilingual**: full English + Arabic support via `src/data/translations.json` (~844 lines) with native RTL.
- **PWA**: service worker auto-updates via `vite-plugin-pwa`; manifest theme color `#09090b`.
- **Stale artifacts**: `tailwind.config.js` targets legacy paths (`./*.html`, `./js/**`) and is effectively unused — styling flows through `@tailwindcss/vite` and `src/styles/main.css`. The root `/public/js/data/*.json` duplicates `src/data/*.json`.
- **Root README** intentionally excluded from this docs restructure.

*Last updated: August 2026*
