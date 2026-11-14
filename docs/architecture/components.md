# Components (`src/components/`)

Global UI parts are implemented as **Custom Elements (Web Components)** for encapsulation and built with `Utils.h` (no `innerHTML` interpolation):

| Element | File | Role |
|---|---|---|
| `<wpt-navbar>` | `navbar.js` | Renders categorized navigation from `src/data/nav.json` (3 groups, 15 links) with Lucide icons, language toggle, command palette trigger, and `rel="noopener noreferrer"` external links. Desktop dropdowns and the mobile drawer use native `popover="auto"` + `popovertarget` (`aria-expanded` synced on `toggle`, Esc dismiss, light dismiss, RTL-aware positioning, and pointer hover-open on `(hover: hover)` devices). |
| `<wpt-footer>` | `footer.js` | Global footer with "Privacy settings" trigger to reopen consent preferences and `rel="noopener noreferrer"` external links |
| `<wpt-consent>` | `consent-banner.js` | Non-modal Consent Mode v2 banner (`role="region"`), auto-injected once by `src/main.js`, shown when no choice is stored or reopened from the footer |

All three are imported once in `src/main.js`, so every page gets them automatically. They read i18n keys from `State.translations`, so they re-render correctly on language change and respect RTL direction.
