# Analytics & Consent Mode v2

WPToolbox uses Google Tag Manager (`GTM-KWMHKN5M`) for general GA4 tracking (via the container's Google Tag page views and Enhanced Measurement) alongside Google Consent Mode v2, managed in [`src/core/consent.js`](../src/core/consent.js) and surfaced via `App.setConsent` and `App.getConsent`.

## Privacy Guarantees

- All tools run 100% client-side; no custom event tracking or tool-payload telemetry is pushed from application code.
- Only general GA4 Google Tag measurement (page views and GTM Enhanced Measurement) runs, gated by Consent Mode v2 defaults and user consent choices.
- Workbox (`vite-plugin-pwa`) is configured with `NetworkOnly` runtime caching for `googletagmanager.com` and `google-analytics.com`.

## Consent Flow & Timing

1. **Early `<head>` default** (injected from [`src/build/head.html`](../src/build/head.html) across all 16 root `*.html` pages, before `gtm.js`):
   - Initializes `window.dataLayer` and `gtag()`.
   - Reads `localStorage.getItem('wpt-consent')` inside a `try/catch` first (failing closed to `null` if storage is unavailable).
   - Calls a single `gtag('consent', 'default', ...)` reflecting the stored choice (`functionality_storage` and `security_storage` always `'granted'`, with no `wait_for_update`):
     - `'all'` → `ad_storage`, `ad_user_data`, `ad_personalization`, and `analytics_storage` all `'granted'`.
     - `'granted'` → `analytics_storage: 'granted'`, and `ad_storage`, `ad_user_data`, `ad_personalization` `'denied'`.
     - `'denied'`, `null`, or any other value → all four `'denied'`.
   - Calls `gtag('js', new Date())` and loads `https://www.googletagmanager.com/gtm.js?id=GTM-KWMHKN5M`.
2. **Banner (`<wpt-consent>` in [`src/components/consent-banner.js`](../src/components/consent-banner.js))**:
   - Auto-injected once on every page by [`src/main.js`](../src/main.js).
   - Shown only when `Consent.getConsent()` is `null` (no stored choice).
   - Offers three equal-prominence options: **Accept all** (`'all'`), **Analytics only** (`'granted'`), and **Reject** (`'denied'`).
   - Can be reopened at any time via the **Privacy settings** button in `<wpt-footer>` (`wpt:open-consent` custom event).
3. **Updating Consent**:
   - `App.setConsent(level)` (delegating to `Consent.setConsent(level)`) stores `'denied' | 'granted' | 'all'` in `localStorage['wpt-consent']` and calls `gtag('consent', 'update', ...)` (explicitly setting all four storage flags back to `'denied'` on `'denied'`).

### Consent Timing Behaviour (Zero-Wait Single Default)

- **Returning visitors (`'granted'` or `'all'`)**: The `<head>` script sets the stored state directly inside the single `gtag('consent', 'default', ...)` call before `gtm.js` loads. When `gtm.init` runs, `analytics_storage` is already `'granted'` with zero wait stall, and the initial `page_view` fires immediately with full `_ga` cookie/session attribution.
- **Returning visitors (`'denied'`)**: All four ad/analytics flags start `'denied'` directly in `consent default` with no `wait_for_update` delay, so the Google Tag dispatches its cookieless ping (`gcs=G100`) immediately.
- **First-time visitors (no stored choice)**: Because `<wpt-consent>` waits for human interaction rather than an async CMP lookup, `wait_for_update` is omitted. On initial load, `ad_*` and `analytics_storage` default to `'denied'`:
  - The Google Tag in `GTM-KWMHKN5M` dispatches the initial `page_view` as a **cookieless, anonymized ping** (`gcs=G100`, no `_ga` cookie) for GA4 behavioral modeling.
  - When the user clicks **Accept all** or **Analytics only**, `App.setConsent()` calls `gtag('consent', 'update', ...)` to update GA4's consent state for subsequent measurement.

## Security Policy (CSP)

Because WPToolbox is deployed as a static site on GitHub Pages without custom HTTP response headers, every root `*.html` page enforces a strict Content Security Policy via `<meta http-equiv="Content-Security-Policy">` placed immediately after `<meta charset="UTF-8">` (before any scripts or stylesheets). The CSP tag and shared `<head>` are injected in both dev and build by [`src/build/head-plugin.js`](../src/build/head-plugin.js) using [`src/build/head.html`](../src/build/head.html).

- **Policy overview** (defined in `CSP_DIRECTIVES` inside `src/build/head-plugin.js`):
  - `default-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `manifest-src 'self'`.
  - `script-src`: `'self'` + auto-computed `'sha256-…'` hash of the inline consent script + `https://www.googletagmanager.com` + `https://*.googletagmanager.com`. `'unsafe-inline'` is intentionally disallowed for scripts.
  - `style-src`: `'self' 'unsafe-inline' https://fonts.googleapis.com https://www.googletagmanager.com`.
  - `font-src`: `'self' https://fonts.gstatic.com data:`.
  - `img-src`: `'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com https://fonts.gstatic.com`.
  - `connect-src`: `'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://www.google.com`.
  - `worker-src`: `'self' blob:` (PWA service worker + Workbox).
- **Auto-computed consent script hash**: There is no hard-coded SHA-256 hash in source HTML/templates. Whenever `wptHeadPlugin` runs, it hashes the exact bytes of the inline `<script>` in `src/build/head.html` (currently `'sha256-NDeS4xv6rVuTqHJy34Ri8d4farXrboARpJZDoVixcyk='`) and inserts it into `script-src`. After building, run `npm run check:csp` (`scripts/check-csp-hash.mjs`) to verify all source pages have the `<!-- wpt:head -->` marker and `pages.json` entry, and all built `dist/*.html` files include a valid CSP without `'unsafe-inline'` in `script-src` whose hashes match every inline `<script>`.
- **Adding new GTM tags**: Any new third-party tag, pixel, or script added inside the `GTM-KWMHKN5M` container will be blocked by the browser unless its script, connect, image, font, or frame origins are explicitly added to `CSP_DIRECTIVES` in one place: `src/build/head-plugin.js`. Rebuild and run `npm run check:csp` to roll the update out across all 16 pages.
