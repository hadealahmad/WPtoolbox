# Components (`src/components/`)

Global UI parts are implemented as **Custom Elements (Web Components)** for encapsulation:

| Element | File | Role |
|---|---|---|
| `<wpt-navbar>` | `navbar.js` | Renders categorized navigation from `src/data/nav.json` (3 groups, 15 links) with lucide icons; handles language switching |
| `<wpt-footer>` | `footer.js` | Global footer |

Both are imported once in `src/main.js`, so every page gets them automatically. They read i18n keys from `State.translations`, so they re-render correctly on language change and respect RTL direction.
