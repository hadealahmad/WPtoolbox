# Analytics & Consent Mode v2

WPToolbox uses Google Tag Manager (`GTM-KWMHKN5M`) with Google Consent Mode v2, centralized in [`src/core/analytics.js`](../src/core/analytics.js) and surfaced via `App.track`, `App.setConsent`, and `App.getConsent`.

## Privacy Guarantees

- All tools continue to run 100% client-side; analytics events never include file contents, filenames, user-entered text, clipboard payloads, or PII.
- Only tool identifiers, file extensions/MIME types, UI state values (theme/language), palette navigation targets, and external link URLs/domains are sent.
- Workbox (`vite-plugin-pwa`) is configured with `NetworkOnly` runtime caching for `googletagmanager.com` and `google-analytics.com`.

## Consent Flow

1. **Early `<head>` default** (all 16 root `*.html` pages, before `gtm.js`):
   - Initializes `window.dataLayer` and `gtag()`.
   - Sets `gtag('consent', 'default', ...)` with `ad_storage`, `ad_user_data`, `ad_personalization`, and `analytics_storage` set to `'denied'` (`functionality_storage` and `security_storage` set to `'granted'`, `wait_for_update: 500`).
   - Immediately checks `localStorage.getItem('wpt-consent')`:
     - `'granted'` → updates `analytics_storage: 'granted'`.
     - `'all'` → updates `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` to `'granted'`.
   - Calls `gtag('js', new Date())` and loads `https://www.googletagmanager.com/gtm.js?id=GTM-KWMHKN5M`.
2. **Banner (`<wpt-consent>` in `src/components/consent-banner.js`)**:
   - Auto-injected once on every page by `src/main.js`.
   - Shown only when `Analytics.getConsent()` is `null` (no stored choice).
   - Offers three equal-prominence options: **Accept all** (`'all'`), **Analytics only** (`'granted'`), and **Reject** (`'denied'`).
   - Can be reopened at any time via the **Privacy settings** button in `<wpt-footer>` (`wpt:open-consent` custom event).
3. **Updating Consent**:
   - `App.setConsent(level)` stores `'denied' | 'granted' | 'all'` in `localStorage['wpt-consent']`, calls `gtag('consent', 'update', ...)` (explicitly setting all four storage flags back to `'denied'` on `'denied'`), and pushes `consent_update` to `dataLayer`.

## Event Catalog

| Event | Parameters | Trigger | Source |
|---|---|---|---|
| `tool_view` | `tool_id` | When a tool registers via `App.registerTool(id, config)` | `src/core/app.js` |
| `tool_success` | `tool_id` | When `App.fireConfetti()` is called on operation success | `src/core/app.js` |
| `file_download` | `tool_id`, `file_extension`, `mime_type` | Inside `App.downloadFile()` | `src/core/app.js` |
| `copy_to_clipboard` | `tool_id` | On successful copy in `Utils.copyToClipboard()` | `src/core/utils.js` |
| `language_change` | `language` | When language switches (`en` / `ar`) via `languageChanged` | `src/core/i18n.js` |
| `theme_change` | `theme` | When theme changes via `UI.setTheme()` / `UI.toggleTheme()` | `src/core/ui.js` |
| `command_palette_open` | — | When `#cmd-palette` opens (Ctrl/Cmd+K or navbar button) | `src/core/ui.js` |
| `command_palette_select` | `target` | When a tool link is selected from `#cmd-results` | `src/core/ui.js` |
| `outbound_click` | `link_url`, `link_domain` | Delegated document click on external `http(s)` links | `src/core/analytics.js` |
| `consent_update` | `consent_level` | When `Analytics.setConsent(level)` updates consent | `src/core/analytics.js` |

## Security Policy (CSP)

Because WPToolbox is deployed as a static site on GitHub Pages without custom HTTP response headers, every root `*.html` page enforces a strict Content Security Policy via `<meta http-equiv="Content-Security-Policy">` placed immediately after `<meta charset="UTF-8">` (before any scripts or stylesheets).

- **Policy overview**:
  - `default-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `manifest-src 'self'`.
  - `script-src`: `'self'` + `'sha256-Oip6BSOueP4OrFxv4cPieX4wlFgT6dUZKKme7nQ4MjY='` + `https://www.googletagmanager.com` + `https://*.googletagmanager.com`. `'unsafe-inline'` is intentionally disallowed for scripts.
  - `style-src`: `'self' 'unsafe-inline' https://fonts.googleapis.com https://www.googletagmanager.com`.
  - `font-src`: `'self' https://fonts.gstatic.com data:`.
  - `img-src`: `'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com https://fonts.gstatic.com`.
  - `connect-src`: `'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`.
  - `worker-src`: `'self' blob:` (PWA service worker + Workbox).
- **Consent script hash**: The `'sha256-…'` token in `script-src` authorizes the exact bytes of the early `<head>` inline Consent Mode v2 script. **Whenever that inline script is modified (including whitespace), its SHA-256 hash MUST be recomputed and updated across all 16 HTML pages.** Run `npm run check:csp` (`scripts/check-csp-hash.mjs`) to verify all source and built (`dist/`) pages match.
- **Adding new GTM tags**: Any new third-party tag, pixel, or script added inside the `GTM-KWMHKN5M` container will be blocked by the browser unless its script, connect, image, font, or frame origins are explicitly added to the CSP in all 16 `*.html` files.

