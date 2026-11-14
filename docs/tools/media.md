# Media & Asset Tools (`nav_group_media`)

Seven tools for image, font, and asset processing — all client-side.

## Image to WebP — `image-converter.js` → `img2webp.html`
- Batch conversion using `createImageBitmap(file)` + `<canvas>` → `canvas.toBlob('image/webp', quality)` with ObjectURL previews (revoked on cleanup) and adjustable quality slider.
- Incremental result card rendering via `App.h()` with explicit `width`/`height`/`decoding="async"`/`loading="lazy"`, `.wpt-deferred` grid, and `App.createYielder()` 50ms budget yielding.
- Per-file and bulk ZIP download buttons (`.btn-download-single`, `#download-zip-btn`); output named `<base>.webp`.
- Uses `BaseTool` file handling (keyboard-accessible drop zone + multi-file + clipboard paste with `onCleanup` teardown).

## Unify Aspect Ratio — `unify-aspect-ratio.js` → `unify-aspect-ratio.html`
- Normalizes a batch of images to a target aspect ratio using `createImageBitmap(file)` + `<canvas>` → `canvas.toBlob` (PNG and WebP) with ObjectURL previews.
- 250ms debounced custom width/height inputs, incremental card rendering via `App.h()`, `.wpt-deferred` grid, `App.createYielder()` yielding, and `onCleanup` teardown for paste listeners, timers, and ObjectURLs.

## QR Generator — `qr-generator.js` → `qr-generator.html`
- Batch QR code generation with `qrcode` (`QRCode.toString` for SVG and `QRCode.toCanvas` + `canvas.toBlob` for PNG/social cards) and ObjectURL previews.
- Safe DOM rendering via `App.h()`, `App.createYielder()` yielding, `.wpt-deferred` result grid, accessible switches/labels, and ZIP export (`qr-codes.zip`).

## Font Cleaner — `clear-fonts.js` → `clearfonts.html`
- Scans theme/plugin files and strips unused font files/references.

## Blocksy Palette — `blocksy-palette.js` → `blocksy-palette.html`
- Generates full color palettes **and gradients** in the OKLCH color space, matching Blocksy theme palette format.

## SVG Sanitizer — `svg-sanitizer.js` → `svg-sanitizer.html`
- Hardened client-side SVG sanitizer (`sanitizeSVGMarkup`): parses with `DOMParser('image/svg+xml')`, rejects `<parsererror>`, enforces strict allowlists of SVG elements and attributes, strips `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, dangerous `<animate>`/`<set>`/`<animateTransform>` targets, all `on*` handlers, unsafe `href`/`xlink:href` (allowing only same-document `#id` fragments or raster `data:image/*` on `<image>`/`<feImage>`), and `style`/`<style>` containing non-`#` `url(...)` or `javascript:`/`vbscript:`/`data:text`.
- Incremental card rendering via `App.h()`, `App.createYielder()` yielding, ObjectURL revocation across runs and on cleanup, and ZIP export.

## Dummy Image Generator — `dummy-image-generator.js` → `dummy-image-generator.html`
- Placeholder JPEG batch generation at custom dimensions/colors with Arabic RTL `<canvas>` text detection (`Utils.isArabic`), `App.createYielder()` yielding, and ZIP export.
