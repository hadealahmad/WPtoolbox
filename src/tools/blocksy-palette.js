/**
 * Blocksy Color Palette Generator
 * Full palette + gradient generation with OKLCH support.
 */
import '../main.js';
import { App } from '../core/app.js';
import { I18n } from '../core/i18n.js';

// ── Utility ───────────────────────────────────────────────────────────────────
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// ── RGB / HSL / HEX ──────────────────────────────────────────────────────────
function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
function hexToHsl(hex) {
    let { r, g, b } = hexToRgb(hex);
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const hue = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    if (s === 0) return rgbToHex(l * 255, l * 255, l * 255);
    return rgbToHex(hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255);
}
function hexToRgbStr(hex) { const { r, g, b } = hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; }
function hexToHslStr(hex) { const { h, s, l } = hexToHsl(hex); return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`; }

// ── OKLCH ─────────────────────────────────────────────────────────────────────
function hexToOklch(hex) {
    const { r, g, b } = hexToRgb(hex);
    const lin = v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const lr = lin(r), lg = lin(g), lb = lin(b);
    const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    const L = +(0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_).toFixed(3);
    const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
    const bk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
    const C = +Math.sqrt(a * a + bk * bk).toFixed(4);
    const H = +((Math.atan2(bk, a) * 180 / Math.PI + 360) % 360).toFixed(1);
    return { L, C, H, str: `oklch(${L} ${C} ${H})` };
}

// ── WCAG Contrast ────────────────────────────────────────────────────────────
function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const vals = [r / 255, g / 255, b / 255];
    const lin = vals.map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrastRatio(h1, h2) {
    const l1 = luminance(h1), l2 = luminance(h2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function ensureContrast(hex, bgHex, target = 4.5) {
    const { h, s } = hexToHsl(hex);
    const bgIsLight = luminance(bgHex) > 0.18;
    let l = bgIsLight ? 20 : 80;
    const step = bgIsLight ? 1.5 : -1.5;
    for (let i = 0; i < 60; i++) {
        const c = hslToHex(h, Math.max(s * 0.5, 5), l);
        if (contrastRatio(c, bgHex) >= target) return c;
        l -= step;
        if (l < 3 || l > 97) break;
    }
    return bgIsLight ? '#111111' : '#f5f5f5';
}
function isLightColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

// ── Format ───────────────────────────────────────────────────────────────────
function parseColorInput(raw) {
    const s = (raw || '').trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(s)) return (s.startsWith('#') ? s : '#' + s).toLowerCase();
    if (/^#?[0-9a-fA-F]{3}$/.test(s)) { const c = s.replace('#',''); return '#' + c.split('').map(x => x+x).join('').toLowerCase(); }
    const rgb = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (rgb) return rgbToHex(+rgb[1], +rgb[2], +rgb[3]);
    const hsl = s.match(/^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%?[,\s]+([\d.]+)%?/i);
    if (hsl) return hslToHex(+hsl[1], +hsl[2], +hsl[3]);
    return null;
}
function formatColor(hex, fmt) {
    if (fmt === 'rgb') return hexToRgbStr(hex);
    if (fmt === 'hsl') return hexToHslStr(hex);
    return hex.toUpperCase();
}

// ── Palette Generation ────────────────────────────────────────────────────────
function generatePalette(color1, color2, mode) {
    const hsl1 = hexToHsl(color1);
    if (mode === 'light') {
        const c5 = hslToHex(hsl1.h, clamp(hsl1.s * 0.25, 2, 30), 90);
        const c6 = hslToHex(hsl1.h, clamp(hsl1.s * 0.15, 1, 20), 94);
        const c7 = hslToHex(hsl1.h, clamp(hsl1.s * 0.07, 0, 10), 97);
        const c8 = '#ffffff';
        return [color1, color2, ensureContrast(hslToHex(hsl1.h, clamp(hsl1.s * 0.35, 5, 25), 30), c5, 4.5), ensureContrast(hslToHex(hsl1.h, clamp(hsl1.s * 0.3, 3, 20), 10), c8, 7.0), c5, c6, c7, c8];
    } else {
        const c8 = hslToHex(hsl1.h, clamp(hsl1.s * 0.07, 0, 8), 8);
        const c7 = hslToHex(hsl1.h, clamp(hsl1.s * 0.08, 0, 9), 11);
        const c6 = hslToHex(hsl1.h, clamp(hsl1.s * 0.10, 0, 10), 14);
        const c5 = hslToHex(hsl1.h, clamp(hsl1.s * 0.13, 0, 12), 18);
        return [color1, color2, ensureContrast(hslToHex(hsl1.h, clamp(hsl1.s * 0.3, 5, 30), 70), c5, 4.5), ensureContrast(hslToHex(hsl1.h, clamp(hsl1.s * 0.2, 3, 20), 90), c8, 7.0), c5, c6, c7, c8];
    }
}

// ── Gradient Generation ───────────────────────────────────────────────────────
function deriveEnhanced(c1, c2) {
    const { h: h1, s: s1, l: l1 } = hexToHsl(c1);
    const { h: h2, s: s2, l: l2 } = hexToHsl(c2);
    return {
        // Analogous neighbours of c1
        warmAnalog:   hslToHex((h1 - 25 + 360) % 360, clamp(s1 * 1.1, 20, 100), clamp(l1 + 5, 30, 78)),
        coolAnalog:   hslToHex((h1 + 28) % 360,         clamp(s1 * 1.1, 20, 100), clamp(l1 + 5, 30, 78)),
        // Triadic (120°) — picks up a third distinct hue
        triadic:      hslToHex((h1 + 120) % 360,         clamp(s1 * 0.95, 25, 100), clamp(l1 + 12, 40, 78)),
        // Split-complement (150°) — a spicy contrast but not opposite
        splitComp:    hslToHex((h1 + 150) % 360,         clamp(s1 * 0.85, 20, 100), clamp(l1 + 5, 35, 72)),
        // True complement (180°) — strong contrast
        complement:   hslToHex((h1 + 180) % 360,         clamp(s1 * 0.85, 20, 100), clamp(l1,    30, 72)),
        // Vivid midpoint: halfway hue between c1 and c2, boosted saturation
        vividMid:     hslToHex(((h1 + h2) / 2) % 360,   clamp(s1 * 1.25, 40, 100), clamp((l1 + l2) / 2, 45, 70)),
        // Dark deep: c2 hue, 25% lighter than darkest
        darkDeep:     hslToHex(h2, s2, clamp(l2 - 18, 8, 40)),
    };
}

function buildGradients(colors) {
    const c1 = colors[0], c2 = colors[1], c4 = colors[3] || colors[0];
    const e = deriveEnhanced(c1, c2);
    const ok = h => hexToOklch(h).str;

    return [
        {
            id: 'accent-flow',
            name: 'Accent Flow',
            desc: 'C1 → C2',
            icon: 'arrow-right',
            enhanced: [],
            preview: `linear-gradient(135deg, ${c1}, ${c2})`,
            css:   `linear-gradient(135deg, ${c1}, ${c2})`,
            oklch: `linear-gradient(in oklch 135deg, ${ok(c1)}, ${ok(c2)})`,
        },
        {
            id: 'vivid-aurora',
            name: 'Vivid Aurora',
            desc: 'Warm shift → C1 → Cool shift',
            icon: 'zap',
            enhanced: [e.warmAnalog, e.coolAnalog],
            preview: `linear-gradient(135deg, ${e.warmAnalog}, ${c1}, ${e.coolAnalog})`,
            css:   `linear-gradient(135deg, ${e.warmAnalog}, ${c1} 50%, ${e.coolAnalog})`,
            oklch: `linear-gradient(in oklch 135deg, ${ok(e.warmAnalog)}, ${ok(c1)} 50%, ${ok(e.coolAnalog)})`,
        },
        {
            id: 'complement-fire',
            name: 'Complement Fire',
            desc: 'C1 → Complement (180°) — Bold contrast',
            icon: 'flame',
            enhanced: [e.complement],
            preview: `linear-gradient(135deg, ${c1}, ${e.complement})`,
            css:   `linear-gradient(135deg, ${c1}, ${e.complement})`,
            oklch: `linear-gradient(in oklch longest hue 135deg, ${ok(c1)}, ${ok(e.complement)})`,
            oklchNote: 'Uses "longest hue" — sweeps the full color wheel',
        },
        {
            id: 'triadic-aurora',
            name: 'Triadic Aurora',
            desc: 'C1 → Triadic (120°) → C2',
            icon: 'triangle',
            enhanced: [e.triadic],
            preview: `linear-gradient(135deg, ${c1}, ${e.triadic}, ${c2})`,
            css:   `linear-gradient(135deg, ${c1}, ${e.triadic} 50%, ${c2})`,
            oklch: `linear-gradient(in oklch 135deg, ${ok(c1)}, ${ok(e.triadic)} 50%, ${ok(c2)})`,
        },
        {
            id: 'radial-glow',
            name: 'Radial Glow',
            desc: 'Spotlight from center',
            icon: 'circle-dot',
            enhanced: [],
            preview: `radial-gradient(ellipse at 35% 50%, ${c1}, ${e.darkDeep})`,
            css:   `radial-gradient(ellipse at 35% 50%, ${c1}, ${e.darkDeep} 80%)`,
            oklch: `radial-gradient(in oklch ellipse at 35% 50%, ${ok(c1)}, ${ok(e.darkDeep)} 80%)`,
        },
        {
            id: 'split-harmony',
            name: 'Split Harmony',
            desc: 'Split-complement (150°) → C1 → C2',
            icon: 'git-branch',
            enhanced: [e.splitComp],
            preview: `linear-gradient(135deg, ${e.splitComp}, ${c1}, ${c2})`,
            css:   `linear-gradient(135deg, ${e.splitComp}, ${c1} 42%, ${c2})`,
            oklch: `linear-gradient(in oklch 135deg, ${ok(e.splitComp)}, ${ok(c1)} 42%, ${ok(c2)})`,
        },
        {
            id: 'vivid-midpoint',
            name: 'Vivid Bridge',
            desc: 'C1 → Vibrant midpoint → C2 — never goes gray',
            icon: 'sparkles',
            enhanced: [e.vividMid],
            preview: `linear-gradient(90deg, ${c1}, ${e.vividMid}, ${c2})`,
            css:   `linear-gradient(90deg, ${c1}, ${e.vividMid} 50%, ${c2})`,
            oklch: `linear-gradient(in oklch 90deg, ${ok(c1)}, ${ok(e.vividMid)} 50%, ${ok(c2)})`,
            oklchNote: 'OKLCH keeps saturation at the midpoint — no muddy gray',
        },
        {
            id: 'deep-hero',
            name: 'Deep Hero',
            desc: 'Deep text → C1 → C2 — perfect for hero sections',
            icon: 'layers',
            enhanced: [],
            preview: `linear-gradient(135deg, ${c4}, ${c1} 50%, ${c2})`,
            css:   `linear-gradient(135deg, ${c4}, ${c1} 50%, ${c2})`,
            oklch: `linear-gradient(in oklch 135deg, ${ok(c4)}, ${ok(c1)} 50%, ${ok(c2)})`,
        },
        {
            id: 'conic-wheel',
            name: 'Conic Sweep',
            desc: 'Full hue rotation — for backgrounds & decoratives',
            icon: 'rotate-cw',
            enhanced: [e.triadic, e.complement],
            preview: `conic-gradient(from 0deg, ${c1}, ${e.triadic}, ${e.complement}, ${c2}, ${c1})`,
            css:   `conic-gradient(from 0deg, ${c1}, ${e.triadic} 33%, ${e.complement} 66%, ${c2} 85%, ${c1})`,
            oklch: `conic-gradient(in oklch from 0deg, ${ok(c1)}, ${ok(e.triadic)} 33%, ${ok(e.complement)} 66%, ${ok(c2)} 85%, ${ok(c1)})`,
        },
    ];
}

// ── Module ────────────────────────────────────────────────────────────────────
export const BlocksyPalette = {
    mode: 'dark',
    colorFormat: 'hex',
    editingId: null,
    currentColors: [],
    _gradientData: {},

    onInit: function() {
        this.onColorInput();
        this.renderSaved();

        const autoGen = document.getElementById('auto-generate');
        const colorFormat = document.getElementById('color-format');
        const modeLight = document.getElementById('mode-light');
        const modeDark = document.getElementById('mode-dark');
        const randomBtn = document.getElementById('random-colors-btn');
        const logoUpload = document.getElementById('logo-upload');
        const savePaletteBtn = document.getElementById('save-palette-btn');
        const copyCssBtn = document.getElementById('copy-css-btn');
        const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        const saveEditBtn = document.getElementById('save-edit-btn');

        if (autoGen) {
            autoGen.addEventListener('change', e => {
                const manualColors = document.getElementById('manual-colors');
                if (manualColors) manualColors.classList.toggle('hidden', e.target.checked);
                this.onColorInput();
            });
        }

        if (colorFormat) {
            colorFormat.addEventListener('change', e => {
                this.colorFormat = e.target.value;
                this.renderPreview(this.currentColors);
            });
        }

        if (modeLight) modeLight.onclick = () => this.setMode('light');
        if (modeDark) modeDark.onclick = () => this.setMode('dark');
        if (randomBtn) randomBtn.onclick = () => this.randomColors();
        if (logoUpload) logoUpload.onchange = (e) => this.extractFromImage(e);
        if (savePaletteBtn) savePaletteBtn.onclick = () => this.savePalette();
        if (copyCssBtn) copyCssBtn.onclick = () => this.copyCSS();
        if (closeEditModalBtn) closeEditModalBtn.onclick = () => this.closeEditModal();
        if (cancelEditBtn) cancelEditBtn.onclick = () => this.closeEditModal();
        if (saveEditBtn) saveEditBtn.onclick = () => this.saveEditModal();

        for (let i = 1; i <= 8; i++) {
            const pk = document.getElementById(`color${i}`);
            const hx = document.getElementById(`color${i}-hex`);
            if (pk) pk.oninput = () => this.onColorInput();
            if (hx) hx.oninput = () => this.onTextInput(i);
        }

        window.addEventListener('languageChanged', () => {
            this.renderSaved();
            this.renderPreview(this.currentColors);
        });

        window.addEventListener('appReady', () => {
            this.renderPreview(this.currentColors);
            this.renderSaved();
        }, { once: true });
    },

    setMode: function(mode) {
        this.mode = mode;
        const a = 'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all border-primary bg-primary/10 text-primary';
        const i = 'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all border-zinc-800 text-zinc-500 hover:border-zinc-600';
        const ml = document.getElementById('mode-light');
        const md = document.getElementById('mode-dark');
        if (ml) ml.className = mode === 'light' ? a : i;
        if (md) md.className  = mode === 'dark'  ? a : i;
        const badge = document.getElementById('preview-mode-badge');
        if (badge) { badge.textContent = I18n.t(`mode_${mode}`); badge.dataset.i18n = `mode_${mode}`; }
        this.onColorInput();
    },

    onColorInput: function() {
        const c1 = document.getElementById('color1')?.value || '#2872fa';
        const c2 = document.getElementById('color2')?.value || '#1559ed';
        const h1 = document.getElementById('color1-hex');
        const h2 = document.getElementById('color2-hex');
        if (h1) h1.value = c1.toUpperCase();
        if (h2) h2.value = c2.toUpperCase();

        const auto = document.getElementById('auto-generate');
        let colors;
        if (auto?.checked) {
            colors = generatePalette(c1, c2, this.mode);
            for (let i = 3; i <= 8; i++) {
                const px = document.getElementById(`color${i}`); if (px) px.value = colors[i-1];
                const hx = document.getElementById(`color${i}-hex`); if (hx) hx.value = colors[i-1].toUpperCase();
            }
        } else {
            const g = (id, fb) => document.getElementById(id)?.value || fb;
            colors = [c1, c2, g('color3','#3a4f66'), g('color4','#192a3d'), g('color5','#e1e8ed'), g('color6','#f2f5f7'), g('color7','#fafbfc'), g('color8','#ffffff')];
        }
        this.currentColors = colors;
        this.renderPreview(colors);
    },

    onTextInput: function(index) {
        const field = document.getElementById(`color${index}-hex`);
        if (!field) return;
        const parsed = parseColorInput(field.value);
        if (parsed) { const p = document.getElementById(`color${index}`); if (p) p.value = parsed; }
        this.onColorInput();
    },

    randomColors: function() {
        const h1 = Math.floor(Math.random() * 360);
        const s1 = Math.floor(Math.random() * 25 + 65);
        const l1 = Math.floor(Math.random() * 18 + 40);
        const c1 = hslToHex(h1, s1, l1);
        const l2 = clamp(l1 - Math.floor(Math.random() * 10 + 10), 18, 50);
        const c2 = hslToHex(h1, Math.min(100, s1 + 5), l2);
        this._applyPrimaryColors(c1, c2);
        App.showToast(App.t('msg_colors_randomized'));
    },

    extractFromImage: function(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const span  = document.getElementById('from-logo-text');
        const label = document.getElementById('from-logo-label');
        if (span)  span.textContent = '…';
        if (label) label.style.opacity = '0.6';
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = 96; canvas.height = 96;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 96, 96);
            const px = ctx.getImageData(0, 0, 96, 96).data;
            const colors = this._extractDominantColors(px);
            if (colors.length >= 2) {
                this._applyPrimaryColors(colors[0], colors[1]);
                App.showToast(App.t('msg_colors_extracted'));
            } else if (colors.length === 1) {
                const { h, s, l } = hexToHsl(colors[0]);
                const c2 = hslToHex(h, Math.min(100, s + 5), clamp(l - 17, 15, 50));
                this._applyPrimaryColors(colors[0], c2);
                App.showToast(App.t('msg_colors_extracted'));
            } else {
                App.showToast(App.t('msg_extract_error'));
            }
            if (span) { span.textContent = App.t('btn_from_image'); span.setAttribute('data-i18n', 'btn_from_image'); }
            if (label) label.style.opacity = '';
            event.target.value = '';
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            if (span) { span.textContent = App.t('btn_from_image'); span.setAttribute('data-i18n', 'btn_from_image'); }
            if (label) label.style.opacity = '';
            App.showToast(App.t('msg_extract_error'));
            event.target.value = '';
        };
        img.src = url;
    },

    _extractDominantColors: function(data) {
        const W = 96, H = 96, STEP = 24, PATCH = 5;
        const bgColor = (() => {
            const anchors = [[0,0],[W-PATCH,0],[0,H-PATCH],[W-PATCH,H-PATCH],[Math.floor((W-PATCH)/2),0],[Math.floor((W-PATCH)/2),H-PATCH],[0,Math.floor((H-PATCH)/2)],[W-PATCH,Math.floor((H-PATCH)/2)]];
            const samples = anchors.map(([ax, ay]) => {
                let sr = 0, sg = 0, sb = 0, n = 0;
                for (let dy = 0; dy < PATCH; dy++) {
                    for (let dx = 0; dx < PATCH; dx++) {
                        const idx = ((ay + dy) * W + (ax + dx)) * 4;
                        if (data[idx + 3] >= 128) { sr += data[idx]; sg += data[idx + 1]; sb += data[idx + 2]; n++; }
                    }
                }
                return n > 0 ? { r: sr / n, g: sg / n, b: sb / n } : null;
            }).filter(Boolean);
            if (samples.length < 3) return null;
            const AGREE = 40;
            const dist  = (a, b) => Math.sqrt((a.r-b.r)**2 + (a.g-b.g)**2 + (a.b-b.b)**2);
            let best = null, bestN = 0;
            for (const ref of samples) {
                const agreeing = samples.filter(s => dist(s, ref) < AGREE);
                if (agreeing.length > bestN) {
                    bestN = agreeing.length;
                    best = { r: agreeing.reduce((s, x) => s + x.r, 0) / agreeing.length, g: agreeing.reduce((s, x) => s + x.g, 0) / agreeing.length, b: agreeing.reduce((s, x) => s + x.b, 0) / agreeing.length };
                }
            }
            return bestN >= Math.ceil(samples.length * 0.5) ? best : null;
        })();
        const BG_EXCL = 50;
        const buckets = new Map();
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 128) continue;
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            if (lum > 0.93 || lum < 0.04) continue;
            if (bgColor) {
                const dr = r - bgColor.r, dg = g - bgColor.g, db = b - bgColor.b;
                if (Math.sqrt(dr * dr + dg * dg + db * db) < BG_EXCL) continue;
            }
            const qr = Math.round(r / STEP) * STEP;
            const qg = Math.round(g / STEP) * STEP;
            const qb = Math.round(b / STEP) * STEP;
            const key = (qr << 16) | (qg << 8) | qb;
            const bk  = buckets.get(key);
            if (bk) { bk.n++; bk.sr += r; bk.sg += g; bk.sb += b; }
            else     { buckets.set(key, { n: 1, sr: r, sg: g, sb: b }); }
        }
        if (buckets.size === 0) return [];
        const candidates = Array.from(buckets.values()).map(bk => {
            const r = Math.round(bk.sr / bk.n), g = Math.round(bk.sg / bk.n), b = Math.round(bk.sb / bk.n);
            const hex = rgbToHex(r, g, b);
            const { s } = hexToHsl(hex);
            return { hex, n: bk.n, score: bk.n * (0.3 + (s / 100) * 0.7) };
        });
        candidates.sort((a, b) => b.score - a.score);
        const result = [candidates[0].hex];
        const { h: h1, l: l1 } = hexToHsl(result[0]);
        for (let i = 1; i < candidates.length; i++) {
            const { h: h2, l: l2, s: s2 } = hexToHsl(candidates[i].hex);
            const hd = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2));
            if (hd > 25 || (s2 < 20 && Math.abs(l1 - l2) > 30)) { result.push(candidates[i].hex); break; }
        }
        if (result.length < 2) {
            const { h, s, l } = hexToHsl(result[0]);
            result.push(hslToHex(h, Math.min(100, s + 5), clamp(l - 18, 15, 50)));
        }
        return result;
    },

    _applyPrimaryColors: function(c1, c2) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        set('color1',     c1);
        set('color1-hex', c1.toUpperCase());
        set('color2',     c2);
        set('color2-hex', c2.toUpperCase());
        this.onColorInput();
    },

    renderPreview: function(colors) {
        const strip = document.getElementById('color-strip');
        const details = document.getElementById('color-details');
        if (!strip || !details) return;
        const fmt = this.colorFormat;
        const roles = [App.t('role_primary'), App.t('role_secondary'), App.t('role_text'), App.t('role_text_deep'), App.t('role_bg_muted'), App.t('role_bg_soft'), App.t('role_bg_light'), App.t('role_bg_base')];
        const c3cr = contrastRatio(colors[2], colors[4]).toFixed(1);
        const c4cr = contrastRatio(colors[3], colors[7]).toFixed(1);

        strip.innerHTML = '';
        colors.forEach((hex, i) => {
            const tc = isLightColor(hex) ? '#000' : '#fff';
            const div = document.createElement('div');
            div.className = "relative flex-1 flex flex-col items-center justify-end pb-1.5 cursor-pointer select-none overflow-hidden";
            div.style.background = hex;
            div.innerHTML = `<span class="text-[9px] font-black pointer-events-none" style="color:${tc}">${i+1}</span><div class="copy-flash absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 pointer-events-none" style="background:rgba(0,0,0,0.42)"><span class="text-base font-black text-white leading-none">✓</span></div>`;
            div.onclick = () => this.copyColor(hex, div);
            strip.appendChild(div);
        });

        details.innerHTML = '';
        colors.forEach((hex, i) => {
            const displayed = formatColor(hex, fmt);
            const role = roles[i];
            let badge = '';
            if (i === 2) { const cr = parseFloat(c3cr); badge = `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cr >= 4.5 ? 'bg-emerald-900/60 text-emerald-400' : 'bg-amber-900/60 text-amber-400'}">${c3cr}:1</span>`; }
            if (i === 3) { const cr = parseFloat(c4cr); badge = `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cr >= 7 ? 'bg-emerald-900/60 text-emerald-400' : 'bg-amber-900/60 text-amber-400'}">${c4cr}:1</span>`; }
            const card = document.createElement('div');
            card.className = "rounded-xl overflow-hidden border border-zinc-800/60 group cursor-pointer hover:scale-105 transition-transform";
            card.innerHTML = `<div style="background:${hex}" class="h-12 flex items-center justify-center relative overflow-hidden"><div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style="background:rgba(0,0,0,0.38)"><i data-lucide="copy" class="w-3.5 h-3.5 text-white"></i></div><div class="copy-flash absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 pointer-events-none" style="background:rgba(0,0,0,0.45)"><span class="text-sm font-black text-white">✓</span></div></div><div class="bg-zinc-950 px-2 py-1.5"><div class="flex items-center justify-between gap-1 mb-0.5"><span class="text-[9px] font-bold text-zinc-600 uppercase">${App.t('label_color') || 'Color'} ${i+1}</span>${badge}</div><p class="text-[9px] font-mono text-zinc-400 truncate">${displayed}</p><p class="text-[9px] text-zinc-600 truncate mt-0.5">${role}</p></div>`;
            card.onclick = () => this.copyColor(hex, card);
            details.appendChild(card);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
        this.renderGradients(colors);
    },

    copyColor: function(hex, el) {
        const text = formatColor(hex, this.colorFormat);
        navigator.clipboard?.writeText(text).catch(() => {});
        const flash = el?.querySelector?.('.copy-flash');
        if (flash) { flash.style.opacity = '1'; setTimeout(() => flash.style.opacity = '0', 700); }
        App.showToast(text);
    },

    copyCSS: function() {
        const colors = this.currentColors;
        const name = document.getElementById('palette-name')?.value.trim() || 'My Palette';
        const css = `/* ${name} — Blocksy Color Palette */\n:root {\n${colors.map((c, i) => `  --theme-palette-color-${i+1}: ${c};`).join('\n')}\n}`;
        navigator.clipboard?.writeText(css).catch(() => {});
        App.showToast(App.t('msg_css_copied') || 'CSS copied!');
    },

    renderGradients: function(colors) {
        const container = document.getElementById('gradients-container');
        if (!container) return;
        const gradients = buildGradients(colors);
        this._gradientData = {};
        container.innerHTML = '';
        gradients.forEach((g) => {
            this._gradientData[g.id] = { css: g.css, oklch: g.oklch };
            const dots = g.enhanced.map(h => `<span class="inline-block w-3 h-3 rounded-full border border-zinc-700/80 shrink-0" style="background:${h}" title="${h}"></span>`).join('');
            const card = document.createElement('div');
            card.className = "shadcn-card overflow-hidden group flex flex-col";
            card.innerHTML = `
                <div class="grad-preview h-24 w-full cursor-pointer relative overflow-hidden flex-shrink-0" style="background:${g.preview}">
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/30"><div class="flex items-center gap-2 bg-black/60 text-white text-[10px] font-bold px-3 py-1.5 rounded-full"><i data-lucide="copy" class="w-3.5 h-3.5"></i><span>${App.t('btn_copy_css')}</span></div></div>
                    <div class="copy-flash absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 pointer-events-none bg-black/40"><span class="text-lg font-black text-white">✓</span></div>
                </div>
                <div class="p-4 flex flex-col gap-3 flex-1">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0"><p class="text-sm font-bold text-white truncate">${g.name}</p>${g.enhanced.length ? `<div class="flex items-center gap-1.5 mt-1.5"><span class="text-[9px] text-zinc-600 font-semibold">${App.t('label_extra_colors')}:</span>${dots}</div>` : ''}</div>
                        <div class="flex gap-1 shrink-0"><button class="tab-css text-[10px] font-bold px-2 py-1 rounded-md transition-all border border-primary/30 bg-primary/20 text-primary">CSS</button><button class="tab-oklch text-[10px] font-bold px-2 py-1 rounded-md transition-all text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">OKLCH</button></div>
                    </div>
                    <div class="panel-css flex items-start gap-2 p-2.5 bg-zinc-950 rounded-lg border border-zinc-800"><code class="text-[10px] font-mono text-zinc-400 break-all flex-1">${g.css}</code><button class="btn-copy-css shrink-0 p-1.5 text-zinc-600 hover:text-primary rounded hover:bg-zinc-800"><i data-lucide="copy" class="w-3 h-3"></i></button></div>
                    <div class="panel-oklch hidden flex flex-col gap-1.5"><div class="flex items-start gap-2 p-2.5 bg-zinc-950 rounded-lg border border-zinc-800"><code class="text-[10px] font-mono text-zinc-400 break-all flex-1">${g.oklch}</code><button class="btn-copy-oklch shrink-0 p-1.5 text-zinc-600 hover:text-primary rounded hover:bg-zinc-800"><i data-lucide="copy" class="w-3 h-3"></i></button></div>${g.oklchNote ? `<p class="text-[9px] text-zinc-600 italic">${g.oklchNote}</p>` : ''}<p class="text-[9px] text-zinc-700">${App.t('label_oklch_support')}</p></div>
                </div>`;
            
            card.querySelector('.grad-preview').onclick = () => {
                const isOklch = !card.querySelector('.panel-oklch').classList.contains('hidden');
                this.copyGradient(g.id, isOklch ? 'oklch' : 'css', card);
            };
            card.querySelector('.tab-css').onclick = (e) => this.switchGradientTab(g.id, 'css', e.target, card);
            card.querySelector('.tab-oklch').onclick = (e) => this.switchGradientTab(g.id, 'oklch', e.target, card);
            card.querySelector('.btn-copy-css').onclick = () => this.copyGradient(g.id, 'css', card);
            card.querySelector('.btn-copy-oklch').onclick = () => this.copyGradient(g.id, 'oklch', card);
            container.appendChild(card);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    },

    switchGradientTab: function(gid, fmt, btn, card) {
        card.querySelectorAll('button[class*="tab-"]').forEach(b => b.className = 'text-[10px] font-bold px-2 py-1 rounded-md transition-all text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800');
        btn.className = 'text-[10px] font-bold px-2 py-1 rounded-md transition-all border border-primary/30 bg-primary/20 text-primary';
        card.querySelector('.panel-css').classList.toggle('hidden', fmt !== 'css');
        card.querySelector('.panel-oklch').classList.toggle('hidden', fmt !== 'oklch');
    },

    copyGradient: function(gid, fmt, card) {
        const text = this._gradientData[gid][fmt];
        navigator.clipboard?.writeText(text).catch(() => {});
        const flash = card.querySelector('.copy-flash');
        if (flash) { flash.style.opacity = '1'; setTimeout(() => flash.style.opacity = '0', 700); }
        App.showToast(`${fmt.toUpperCase()} ${App.t('msg_gradient_copied') || 'gradient copied!'}`);
    },

    savePalette: function() {
        const name = document.getElementById('palette-name')?.value.trim();
        if (!name) { App.showToast(App.t('msg_enter_palette_name')); document.getElementById('palette-name')?.focus(); return; }
        const p = this.getSaved();
        p.push({ id: 'palette_' + Date.now(), name, mode: this.mode, colors: [...this.currentColors], createdAt: Date.now() });
        this.setSaved(p);
        this.renderSaved();
        App.showToast(App.t('msg_palette_saved'));
        App.fireConfetti();
    },

    deletePalette: function(id, e) {
        if (e) e.stopPropagation();
        this.setSaved(this.getSaved().filter(p => p.id !== id));
        this.renderSaved();
        App.showToast(App.t('msg_palette_deleted'));
    },

    loadPalette: function(id) {
        const p = this.getSaved().find(p => p.id === id);
        if (!p) return;
        this.setMode(p.mode || 'dark');
        document.getElementById('palette-name').value = p.name;
        document.getElementById('color1').value = p.colors[0];
        document.getElementById('color1-hex').value = p.colors[0].toUpperCase();
        document.getElementById('color2').value = p.colors[1];
        document.getElementById('color2-hex').value = p.colors[1].toUpperCase();
        const auto = document.getElementById('auto-generate');
        if (auto) auto.checked = false;
        document.getElementById('manual-colors').classList.remove('hidden');
        for (let i = 3; i <= 8; i++) {
            const pk = document.getElementById(`color${i}`); if (pk) pk.value = p.colors[i-1];
            const hx = document.getElementById(`color${i}-hex`); if (hx) hx.value = p.colors[i-1].toUpperCase();
        }
        this.onColorInput();
        App.showToast(App.t('msg_palette_loaded'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    openEditModal: function(id, e) {
        if (e) e.stopPropagation();
        const p = this.getSaved().find(p => p.id === id);
        if (!p) return;
        this.editingId = id;
        document.getElementById('edit-palette-name').value = p.name;
        const container = document.getElementById('edit-color-inputs');
        container.innerHTML = p.colors.map((hex, i) => `
            <div class="flex items-center gap-3">
                <input type="color" id="edit-c${i+1}" value="${hex}" class="w-9 h-9 rounded-lg border border-zinc-800 bg-zinc-950 cursor-pointer p-0.5">
                <span class="text-[10px] text-zinc-500 w-14 shrink-0">${App.t('label_color')} ${i+1}</span>
                <input type="text" id="edit-c${i+1}-hex" value="${hex.toUpperCase()}" class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-primary">
            </div>`).join('');
        
        for (let i = 1; i <= 8; i++) {
            const pk = document.getElementById(`edit-c${i}`);
            const hx = document.getElementById(`edit-c${i}-hex`);
            pk.oninput = () => hx.value = pk.value.toUpperCase();
            hx.oninput = () => { const prs = parseColorInput(hx.value); if (prs) pk.value = prs; };
        }
        document.getElementById('edit-modal').classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    },

    closeEditModal: function() {
        document.getElementById('edit-modal').classList.add('hidden');
        this.editingId = null;
    },

    saveEditModal: function() {
        if (!this.editingId) return;
        const palettes = this.getSaved();
        const p = palettes.find(p => p.id === this.editingId);
        const name = document.getElementById('edit-palette-name').value.trim();
        if (!name || !p) return;
        p.name = name;
        for (let i = 1; i <= 8; i++) { const pk = document.getElementById(`edit-c${i}`); if (pk) p.colors[i-1] = pk.value; }
        this.setSaved(palettes);
        this.closeEditModal();
        this.renderSaved();
        App.showToast(App.t('msg_palette_saved'));
    },

    renderSaved: function() {
        const list = document.getElementById('saved-palettes-list');
        const empty = document.getElementById('empty-saved');
        const palettes = this.getSaved();
        if (palettes.length === 0) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
        empty.classList.add('hidden');
        list.innerHTML = '';
        palettes.forEach(p => {
            const card = document.createElement('div');
            card.className = "shadcn-card p-4 flex items-center gap-4 hover:border-zinc-700 transition-all group cursor-pointer";
            card.innerHTML = `
                <div class="flex rounded-lg overflow-hidden h-10 w-28 shrink-0 shadow-sm border border-zinc-800">${p.colors.map(h => `<div class="flex-1" style="background:${h}"></div>`).join('')}</div>
                <div class="flex-1 min-w-0"><p class="text-sm font-bold text-white truncate">${p.name}</p><p class="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5"><i data-lucide="${p.mode==='dark'?'moon':'sun'}" class="w-3 h-3"></i><span>${I18n.t('mode_'+p.mode)}</span></p></div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="btn-edit p-2 text-zinc-500 hover:text-primary rounded-lg hover:bg-zinc-800"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
                    <button class="btn-del p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>`;
            card.onclick = () => this.loadPalette(p.id);
            card.querySelector('.btn-edit').onclick = (e) => this.openEditModal(p.id, e);
            card.querySelector('.btn-del').onclick = (e) => this.deletePalette(p.id, e);
            list.appendChild(card);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    },

    getSaved: () => JSON.parse(localStorage.getItem('wptoolbox_blocksy_palettes') || '[]'),
    setSaved: (p) => localStorage.setItem('wptoolbox_blocksy_palettes', JSON.stringify(p)),
};

App.registerTool('BlocksyPalette', BlocksyPalette);
