import '../main.js';
import { App } from '../core/app.js';
import { renderIcons } from '../core/icons.js';

const ALLOWED_SVG_ELEMENTS = new Set([
    'svg', 'g', 'defs', 'symbol', 'use', 'title', 'desc', 'metadata', 'switch',
    'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'text', 'tspan', 'textpath',
    'lineargradient', 'radialgradient', 'stop', 'pattern', 'clippath', 'mask', 'marker', 'view',
    'image', 'style',
    'filter', 'fegaussianblur', 'feoffset', 'feblend', 'fecolormatrix', 'fecomponenttransfer',
    'fefunca', 'fefuncr', 'fefuncg', 'fefuncb', 'fecomposite', 'feflood', 'femerge',
    'femergenode', 'fedropshadow', 'femorphology', 'feturbulence', 'fedisplacementmap',
    'feconvolvematrix', 'fespotlight', 'fepointlight', 'fedistantlight',
    'fediffuselighting', 'fespecularlighting', 'feimage', 'fetile',
    'animate', 'animatetransform', 'animatemotion', 'mpath', 'set'
]);

const ANIMATION_ELEMENTS = new Set([
    'animate', 'animatetransform', 'animatemotion', 'set'
]);

const ALLOWED_SVG_ATTRIBUTES = new Set([
    // Core / Global
    'id', 'class', 'style', 'tabindex', 'lang', 'xml:lang', 'xml:space', 'xmlns', 'xmlns:xlink', 'role',
    // Viewport & Geometry
    'viewbox', 'preserveaspectratio', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
    'width', 'height', 'd', 'points', 'pathlength', 'transform', 'transform-origin',
    'gradientunits', 'gradienttransform', 'spreadmethod',
    'patternunits', 'patterncontentunits', 'patterntransform',
    'clippathunits', 'maskunits', 'maskcontentunits',
    'markerunits', 'markerwidth', 'markerheight', 'refx', 'refy', 'orient',
    'offset', 'fx', 'fy', 'fr',
    // Presentation
    'fill', 'fill-opacity', 'fill-rule',
    'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
    'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity',
    'opacity', 'color', 'stop-color', 'stop-opacity', 'display', 'visibility', 'overflow',
    'clip-path', 'clip-rule', 'mask', 'filter',
    'marker-start', 'marker-mid', 'marker-end',
    'paint-order', 'vector-effect', 'shape-rendering', 'image-rendering', 'text-rendering',
    'color-interpolation', 'color-interpolation-filters', 'mix-blend-mode', 'isolation',
    'flood-color', 'flood-opacity', 'lighting-color',
    // Text
    'dx', 'dy', 'text-anchor', 'dominant-baseline', 'alignment-baseline', 'baseline-shift',
    'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch',
    'letter-spacing', 'word-spacing', 'text-decoration', 'direction', 'unicode-bidi', 'writing-mode',
    'startoffset', 'method', 'spacing',
    // References
    'href', 'xlink:href',
    // Filter primitives
    'in', 'in2', 'result', 'stddeviation', 'mode', 'type', 'values', 'tablevalues',
    'slope', 'intercept', 'amplitude', 'exponent', 'operator', 'k1', 'k2', 'k3', 'k4',
    'radius', 'scale', 'xchannelselector', 'ychannelselector', 'order', 'kernelmatrix',
    'divisor', 'bias', 'targetx', 'targety', 'edgemode', 'kernelunitlength', 'preservealpha',
    'surfacescale', 'specularconstant', 'specularexponent', 'diffuseconstant',
    'azimuth', 'elevation', 'pointsatx', 'pointsaty', 'pointsatz', 'limitingconeangle',
    'numoctaves', 'seed', 'basefrequency', 'stitchtiles',
    // Animation (safe subset)
    'attributename', 'attributetype', 'begin', 'dur', 'end', 'min', 'max',
    'restart', 'repeatcount', 'repeatdur', 'calcmode', 'keytimes', 'keysplines',
    'from', 'to', 'by', 'additive', 'accumulate', 'path', 'keypoints', 'rotate', 'origin',
    // Conditional
    'systemlanguage'
]);

const RASTER_DATA_URI_RE = /^data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i;
const SAFE_FRAGMENT_RE = /^#[A-Za-z_][\w:.-]*$/;

function decodeCssEscapes(str) {
    return String(str).replace(/\\([0-9a-fA-F]{1,6})\s?|\\(.)/g, (_, hex, ch) => {
        if (hex) {
            const code = parseInt(hex, 16);
            return Number.isFinite(code) && code > 0 && code <= 0x10ffff
                ? String.fromCodePoint(code)
                : '';
        }
        return ch || '';
    });
}

function normalizeForSchemeCheck(str) {
    return decodeCssEscapes(String(str || ''))
        .replace(/[\u0000-\u0020]+/g, '')
        .toLowerCase();
}

function hasUnsafeUrlCall(rawText) {
    const stripped = decodeCssEscapes(String(rawText || '')).replace(/\/\*[\s\S]*?\*\//g, '');
    // Catch any url( occurrence, including malformed/unclosed ones
    const urlTokenRe = /url\s*\(/gi;
    let match;
    while ((match = urlTokenRe.exec(stripped)) !== null) {
        const rest = stripped.slice(match.index + match[0].length);
        const fullMatch = rest.match(/^\s*(?:'([^']*)'|"([^"]*)"|([^)]*))\)/);
        if (!fullMatch) return true;
        const target = (fullMatch[1] ?? fullMatch[2] ?? fullMatch[3] ?? '').trim();
        if (!SAFE_FRAGMENT_RE.test(target)) return true;
    }
    return false;
}

function isSafeCssText(cssText) {
    const withoutComments = String(cssText || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const normalized = normalizeForSchemeCheck(withoutComments);
    if (
        normalized.includes('javascript:') ||
        normalized.includes('vbscript:') ||
        normalized.includes('data:text') ||
        normalized.includes('data:image/svg+xml') ||
        normalized.includes('expression(') ||
        normalized.includes('-moz-binding') ||
        normalized.includes('behavior:') ||
        normalized.includes('@import')
    ) {
        return false;
    }
    return !hasUnsafeUrlCall(withoutComments);
}

function isSafeAttributeValue(value) {
    const normalized = normalizeForSchemeCheck(value);
    if (
        normalized.includes('javascript:') ||
        normalized.includes('vbscript:') ||
        normalized.includes('data:text') ||
        normalized.includes('data:image/svg+xml')
    ) {
        return false;
    }
    return !hasUnsafeUrlCall(value);
}

function isSafeHref(value, tagName) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return false;
    if (SAFE_FRAGMENT_RE.test(trimmed)) return true;
    if ((tagName === 'image' || tagName === 'feimage') && RASTER_DATA_URI_RE.test(trimmed)) {
        return true;
    }
    return false;
}

export function sanitizeSVGMarkup(svgText) {
    if (typeof svgText !== 'string' || !svgText.trim()) {
        throw new Error('Empty SVG input');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');

    const parserError = doc.querySelector('parsererror')
        || doc.getElementsByTagNameNS('http://www.mozilla.org/newlayout/xml/parsererror.xml', 'parsererror')[0];
    if (parserError || !doc.documentElement || doc.documentElement.localName.toLowerCase() !== 'svg') {
        throw new Error('Invalid SVG markup');
    }

    const walkAndClean = (el) => {
        const tag = (el.localName || el.tagName || '').toLowerCase();

        if (!ALLOWED_SVG_ELEMENTS.has(tag)) {
            el.remove();
            return;
        }

        if (ANIMATION_ELEMENTS.has(tag)) {
            const targetAttr = normalizeForSchemeCheck(el.getAttribute('attributeName') || '');
            const attrBase = targetAttr.includes(':') ? targetAttr.split(':').pop() : targetAttr;
            if (
                attrBase === 'href' ||
                attrBase === 'src' ||
                attrBase === 'data' ||
                attrBase.startsWith('on') ||
                !isSafeAttributeValue(el.getAttribute('values') || '') ||
                !isSafeAttributeValue(el.getAttribute('from') || '') ||
                !isSafeAttributeValue(el.getAttribute('to') || '') ||
                !isSafeAttributeValue(el.getAttribute('by') || '')
            ) {
                el.remove();
                return;
            }
        }

        if (tag === 'style') {
            if (!isSafeCssText(el.textContent || '')) {
                el.remove();
                return;
            }
        }

        for (const attr of Array.from(el.attributes)) {
            const attrName = attr.name.toLowerCase();
            const localAttr = (attr.localName || attrName).toLowerCase();

            if (attrName.startsWith('on')) {
                el.removeAttribute(attr.name);
                continue;
            }

            const isAllowedAttr = ALLOWED_SVG_ATTRIBUTES.has(attrName) || localAttr.startsWith('aria-');
            if (!isAllowedAttr) {
                el.removeAttribute(attr.name);
                continue;
            }

            if (attrName === 'href' || attrName === 'xlink:href' || localAttr === 'href') {
                if (!isSafeHref(attr.value, tag)) {
                    el.removeAttribute(attr.name);
                }
                continue;
            }

            if (attrName === 'style') {
                if (!isSafeCssText(attr.value)) {
                    el.removeAttribute(attr.name);
                }
                continue;
            }

            if (!isSafeAttributeValue(attr.value)) {
                el.removeAttribute(attr.name);
            }
        }

        for (const child of Array.from(el.children)) {
            walkAndClean(child);
        }
    };

    walkAndClean(doc.documentElement);

    if (!doc.documentElement.getAttribute('xmlns')) {
        doc.documentElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const serializer = new XMLSerializer();
    let cleanSvg = serializer.serializeToString(doc.documentElement);

    // Strip comments, XML declarations, and doctypes
    cleanSvg = cleanSvg.replace(/<!--[\s\S]*?-->/g, '');
    cleanSvg = cleanSvg.replace(/<\?xml[\s\S]*?\?>/gi, '');
    cleanSvg = cleanSvg.replace(/<!DOCTYPE[\s\S]*?>/gi, '');

    return cleanSvg.trim();
}

export const SVGSanitizer = App.registerTool('SVGSanitizer', {
    progressBarId: 'processing-bar',
    results: [],
    multiple: true,

    onCleanup: function() {
        if (this._onPaste) {
            document.removeEventListener('paste', this._onPaste);
            this._onPaste = null;
        }
        if (this._progressTimer) {
            clearTimeout(this._progressTimer);
            this._progressTimer = null;
        }
        this.revokeResultUrls();
    },

    revokeResultUrls: function() {
        for (const item of this.results) {
            if (item.url) {
                URL.revokeObjectURL(item.url);
                item.url = null;
            }
        }
    },

    onInit: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        const downloadZipBtn = document.getElementById('download-zip-btn');
        const browseBtn = document.getElementById('browse-files-btn');
        const fileInput = document.getElementById('file-input');

        if (browseBtn && fileInput) {
            browseBtn.addEventListener('click', () => fileInput.click());
        }

        // Global Paste (cleaned up in onCleanup)
        this._onPaste = (e) => {
            const target = e.target;
            if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
            const pasted = e.clipboardData?.files;
            if (!pasted) return;
            const files = Array.from(pasted).filter(f => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'));
            if (files.length > 0) {
                this.onFiles(files);
            }
        };
        document.addEventListener('paste', this._onPaste);

        if (downloadZipBtn) {
            downloadZipBtn.addEventListener('click', () => this.downloadZip());
        }
    },

    onFiles: async function(files) {
        const svgFiles = Array.from(files).filter(f => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'));

        if (svgFiles.length === 0) {
            App.showToast(App.t('msg_upload_images') || 'Please upload valid SVG files.', { type: 'error' });
            return;
        }

        if (this._progressTimer) {
            clearTimeout(this._progressTimer);
            this._progressTimer = null;
        }

        this.updateProgress(0);
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.classList.remove('hidden');
        const resultsGrid = document.getElementById('results-grid');
        if (resultsGrid) resultsGrid.replaceChildren();

        this.revokeResultUrls();
        this.results = [];

        const maybeYield = App.createYielder();
        let processed = 0;
        let failed = 0;
        const total = svgFiles.length;

        for (const file of svgFiles) {
            if (this.isCancelled) break;

            try {
                const text = await file.text();
                const sanitized = this.sanitizeSVG(text);
                const blob = new Blob([sanitized], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);

                const origSize = file.size;
                const newSize = blob.size;
                const saved = origSize - newSize;
                const savedPercent = origSize > 0 ? Number(((saved / origSize) * 100).toFixed(1)) : 0;

                const originalName = file.name.replace(/\.svg$/i, '');
                const newName = `${originalName}-sanitized.svg`;

                this.results.push({ name: newName, url, blob });

                if (resultsGrid) {
                    this.renderResultCard(resultsGrid, newName, url, blob, origSize, newSize, savedPercent);
                }
            } catch (err) {
                console.error('Error processing file:', file.name, err);
                failed++;
            }

            processed++;
            this.updateProgress((processed / total) * 100);
            await maybeYield();
        }

        this._progressTimer = setTimeout(() => {
            this.updateProgress(0);
            this._progressTimer = null;
        }, 1000);

        if (failed > 0 && this.results.length === 0) {
            App.showToast('Failed to parse one or more SVG files.', { type: 'error' });
        } else if (failed > 0) {
            App.showToast(`Processed with ${failed} invalid SVG file(s) skipped.`, { type: 'error' });
        } else {
            App.showToast(App.t('msg_all_done') || 'All files processed!', { type: 'success' });
        }
    },

    sanitizeSVG: function(svgText) {
        return sanitizeSVGMarkup(svgText);
    },

    renderResultCard: function(container, name, url, blob, oldSize, newSize, savedPercent) {
        const downloadLabel = App.t('btn_download') || 'Download';
        const oldSizeText = App.formatSize ? App.formatSize(oldSize) : `${oldSize} B`;
        const newSizeText = App.formatSize ? App.formatSize(newSize) : `${newSize} B`;

        const metaChildren = [
            App.h('p', {
                class: 'text-sm font-medium text-white truncate',
                title: name,
                text: name
            }),
            App.h(
                'div',
                { class: 'flex items-center justify-between mt-2' },
                App.h('span', { class: 'text-xs text-zinc-500 line-through', text: oldSizeText }),
                App.h('i', { attrs: { 'data-lucide': 'arrow-right' }, class: 'w-3 h-3 text-zinc-600' }),
                App.h('span', { class: 'text-xs font-bold text-emerald-400', text: newSizeText })
            )
        ];

        if (savedPercent > 0) {
            metaChildren.push(
                App.h('p', {
                    class: 'text-[10px] text-emerald-500/80 mt-1 text-end',
                    text: `Saved ${savedPercent}%`
                })
            );
        }

        const card = App.h(
            'div',
            { class: 'shadcn-card p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative group overflow-hidden bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800' },
            App.h(
                'div',
                { class: 'h-32 w-full bg-zinc-950/50 rounded-lg flex items-center justify-center p-4 relative checkerboard-bg' },
                App.h('img', {
                    src: url,
                    alt: name,
                    width: 128,
                    height: 128,
                    decoding: 'async',
                    loading: 'lazy',
                    class: 'max-h-full max-w-full object-contain'
                }),
                App.h(
                    'div',
                    { class: 'absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2' },
                    App.h(
                        'button',
                        {
                            type: 'button',
                            class: 'dl-btn shadcn-button shadcn-button-primary h-8 px-4 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            attrs: { 'aria-label': `${downloadLabel} ${name}` },
                            on: { click: () => App.downloadFile(blob, name, 'image/svg+xml') }
                        },
                        App.h('i', { attrs: { 'data-lucide': 'download' }, class: 'w-4 h-4 pointer-events-none' }),
                        App.h('span', { attrs: { 'data-i18n': 'btn_download' }, text: downloadLabel })
                    )
                )
            ),
            App.h('div', null, ...metaChildren)
        );

        container.appendChild(card);
        renderIcons(card);
    },

    downloadZip: async function() {
        if (!this.results.length) return;

        const btn = document.getElementById('download-zip-btn');
        const originalNodes = btn ? Array.from(btn.childNodes) : [];
        if (btn) {
            btn.replaceChildren(
                App.h('i', { attrs: { 'data-lucide': 'loader-2' }, class: 'w-4 h-4 animate-spin' }),
                App.h('span', { text: 'Zipping...' })
            );
            renderIcons(btn);
            btn.disabled = true;
        }

        try {
            const mod = await import('jszip');
            const JSZip = mod.default || mod;
            const zip = new JSZip();
            this.results.forEach(item => {
                zip.file(item.name, item.blob);
            });
            const content = await zip.generateAsync({ type: 'blob' });
            App.downloadFile(content, `sanitized_svgs_${Date.now()}.zip`, 'application/zip');
            App.showToast('ZIP downloaded successfully!', { type: 'success' });
            App.fireConfetti();
        } catch (error) {
            console.error('Error creating ZIP:', error);
            App.showToast('Failed to create ZIP.', { type: 'error' });
        } finally {
            if (btn) {
                btn.replaceChildren(...originalNodes);
                renderIcons(btn);
                btn.disabled = false;
            }
        }
    }
});
