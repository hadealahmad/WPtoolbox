# Developer Reference Tools (`nav_group_dev`)

Three content/reference tools backed by multilingual JSON databases.

## Snippets Library — `snippets.js` → `snippets.html`
- Browsable WordPress code snippets from `src/data/snippets.json` (~10 entries, en + ar).
- Copy-to-clipboard via core Utils; monospace rendering with JetBrains Mono.

## WP Export Mapper — `wp-mapper.js` → `wp-mapper.html`
- Parses WordPress export (WXR/XML) files and maps/analyzes their structure client-side.

## Tips & Facts — `tips.js` → `tips.html`
- Rotating WordPress tips from `src/data/tips.json`; each entry is an object carrying translated strings resolved through the I18n helper (object-or-string lookup).
