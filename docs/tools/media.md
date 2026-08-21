# Media & Asset Tools (`nav_group_media`)

Seven tools for image, font, and asset processing — all client-side.

## Image to WebP — `image-converter.js` → `img2webp.html`
- Batch conversion via `<canvas>` → `canvas.toDataURL('image/webp', quality)`; adjustable quality slider.
- Per-file and bulk download buttons (`.btn-download-single`); output named `<base>.webp`.
- Uses BaseTool file handling (drop zone + multi-file).

## Unify Aspect Ratio — `unify-aspect-ratio.js` → `unify-aspect-ratio.html`
- Normalizes a batch of images to one aspect ratio via canvas cropping/fitting.

## QR Generator — `qr-generator.js` → `qr-generator.html`
- QR code rendering with the `qrcode` npm package; downloadable output.

## Font Cleaner — `clear-fonts.js` → `clearfonts.html`
- Scans theme/plugin files and strips unused font files/references.

## Blocksy Palette — `blocksy-palette.js` → `blocksy-palette.html`
- Generates full color palettes **and gradients** in the OKLCH color space, matching Blocksy theme palette format.

## SVG Sanitizer — `svg-sanitizer.js` → `svg-sanitizer.html`
- Cleans uploaded SVG markup of unsafe elements/attributes for WordPress-safe use; reveals `#results-section` when done.

## Dummy Image Generator — `dummy-image-generator.js` → `dummy-image-generator.html`
- Placeholder image generation at custom dimensions/colors.
