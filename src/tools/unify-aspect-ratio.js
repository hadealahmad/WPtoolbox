/**
 * Unify Aspect Ratio Tool
 */
import '../main.js';
import { App } from '../core/app.js';
import { renderIcons } from '../core/icons.js';

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error(`Failed to encode ${type}`));
        }, type, quality);
    });
}

export const UnifyAspectRatio = App.registerTool('UnifyAspectRatio', {
    progressBarId: 'processing-bar',
    targetRatio: 1, // 1:1 default
    customWidth: 1000,
    customHeight: 1000,
    processedImages: [],
    lastFiles: null,
    multiple: true,
    resultsId: 'results-section',
    _runId: 0,

    onCleanup: function() {
        if (this._onPaste) {
            document.removeEventListener('paste', this._onPaste);
            this._onPaste = null;
        }
        if (this._dimTimer) {
            clearTimeout(this._dimTimer);
            this._dimTimer = null;
        }
        if (this._progressTimer) {
            clearTimeout(this._progressTimer);
            this._progressTimer = null;
        }
        this.revokePreviewUrls();
    },

    revokePreviewUrls: function() {
        for (const img of this.processedImages) {
            if (img.previewUrl) {
                URL.revokeObjectURL(img.previewUrl);
                img.previewUrl = null;
            }
        }
    },

    clearResults: function() {
        this.revokePreviewUrls();
        this.processedImages = [];
        const grid = document.getElementById('results-grid');
        if (grid) grid.replaceChildren();
    },

    onInit: function() {
        const ratioBtns = document.querySelectorAll('.ratio-btn');
        const zipBtn = document.getElementById('download-zip-btn');
        const zipWebpBtn = document.getElementById('download-zip-webp-btn');
        const customWidthInput = document.getElementById('custom-width');
        const customHeightInput = document.getElementById('custom-height');
        const customRatioInputs = document.getElementById('custom-ratio-inputs');
        const browseBtn = document.getElementById('browse-files-btn');
        const fileInput = document.getElementById('file-input');

        if (browseBtn && fileInput) {
            browseBtn.addEventListener('click', () => fileInput.click());
        }

        // Ratio button logic
        ratioBtns.forEach(btn => {
            btn.onclick = () => {
                ratioBtns.forEach(b => {
                    b.classList.remove('active', 'bg-primary', 'text-primary-foreground');
                    b.classList.add('bg-zinc-900/50', 'text-white');
                    b.setAttribute('aria-pressed', 'false');
                });

                btn.classList.add('active', 'bg-primary', 'text-primary-foreground');
                btn.classList.remove('bg-zinc-900/50', 'text-white');
                btn.setAttribute('aria-pressed', 'true');

                const ratio = btn.dataset.ratio;
                if (ratio === 'custom') {
                    if (customRatioInputs) customRatioInputs.classList.remove('hidden');
                    this.updateTargetRatio();
                } else {
                    if (customRatioInputs) customRatioInputs.classList.add('hidden');
                    const [w, h] = ratio.split(':').map(Number);
                    if (w > 0 && h > 0) this.targetRatio = w / h;
                }

                if (this.lastFiles) {
                    this.reprocessLastFiles();
                }
            };
        });

        // Custom input logic (debounced 250ms)
        [customWidthInput, customHeightInput].forEach(input => {
            if (input) {
                input.oninput = () => {
                    clearTimeout(this._dimTimer);
                    this._dimTimer = setTimeout(() => {
                        this._dimTimer = null;
                        if (!this.updateTargetRatio()) return;
                        if (this.lastFiles) {
                            this.reprocessLastFiles();
                        }
                    }, 250);
                };
            }
        });

        if (zipBtn) zipBtn.onclick = () => this.downloadZip(false);
        if (zipWebpBtn) zipWebpBtn.onclick = () => this.downloadZip(true);

        // Clipboard listener (removed in onCleanup)
        this._onPaste = (e) => {
            const target = e.target;
            if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
            this.handlePaste(e);
        };
        document.addEventListener('paste', this._onPaste);
    },

    onLanguageChange: function() {
        if (this.processedImages.length > 0) this.renderResults();
    },

    onFiles: function(files) {
        return this.handleFiles(files);
    },

    updateTargetRatio: function() {
        const wInput = document.getElementById('custom-width');
        const hInput = document.getElementById('custom-height');
        const w = parseInt(wInput?.value, 10);
        const h = parseInt(hInput?.value, 10);
        if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
            return false;
        }
        this.targetRatio = w / h;
        return true;
    },

    reprocessLastFiles: function() {
        if (!this.lastFiles) return;
        this.clearResults();
        this.handleFiles(this.lastFiles);
    },

    handlePaste: async function(e) {
        const items = e.clipboardData?.items;
        if (!items) return;

        const pastedFiles = [];
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) pastedFiles.push(file);
            }
        }
        if (pastedFiles.length > 0) {
            await this.handleFiles(pastedFiles);
        }
    },

    handleFiles: async function(files) {
        if (!files || !files.length) return;
        this.lastFiles = files;

        const runId = ++this._runId;
        if (this._progressTimer) {
            clearTimeout(this._progressTimer);
            this._progressTimer = null;
        }

        const progressBar = document.getElementById(this.config.progressBarId);
        const maybeYield = App.createYielder();
        const total = files.length;
        let processed = 0;
        let rejected = 0;

        for (const file of files) {
            if (runId !== this._runId || this.isCancelled) break;

            if (!file.type.startsWith('image/')) {
                rejected++;
                processed++;
                if (progressBar) progressBar.style.width = `${Math.round((processed / total) * 100)}%`;
                await maybeYield();
                continue;
            }

            try {
                const item = await this.processImage(file);
                if (runId !== this._runId || this.isCancelled) {
                    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
                    break;
                }
                this.processedImages.push(item);
                this.appendResultCard(item);
            } catch (err) {
                console.error('Error processing image:', file.name, err);
                rejected++;
            }

            processed++;
            if (progressBar) progressBar.style.width = `${Math.round((processed / total) * 100)}%`;
            await maybeYield();
        }

        if (runId !== this._runId) return;

        if (rejected > 0) {
            App.showToast(App.t('msg_upload_images') || 'Please upload only images.', { type: 'error' });
        }

        this._progressTimer = setTimeout(() => {
            if (progressBar) progressBar.style.width = '0%';
            this._progressTimer = null;
        }, 1000);
    },

    processImage: async function(file) {
        const bitmap = await createImageBitmap(file);
        try {
            let canvasWidth;
            let canvasHeight;
            const imgRatio = bitmap.width / bitmap.height;

            if (imgRatio > this.targetRatio) {
                canvasWidth = bitmap.width;
                canvasHeight = Math.max(1, Math.round(bitmap.width / this.targetRatio));
            } else {
                canvasHeight = bitmap.height;
                canvasWidth = Math.max(1, Math.round(bitmap.height * this.targetRatio));
            }

            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');

            const x = (canvasWidth - bitmap.width) / 2;
            const y = (canvasHeight - bitmap.height) / 2;

            ctx.drawImage(bitmap, x, y, bitmap.width, bitmap.height);

            const [pngBlob, webpBlob] = await Promise.all([
                canvasToBlob(canvas, 'image/png'),
                canvasToBlob(canvas, 'image/webp', 0.8)
            ]);

            const previewUrl = URL.createObjectURL(pngBlob);

            return {
                name: `unified-${file.name}`,
                pngBlob,
                webpBlob,
                previewUrl,
                width: canvasWidth,
                height: canvasHeight,
                originalName: file.name
            };
        } finally {
            bitmap.close();
        }
    },

    buildResultCard: function(img) {
        const card = App.h(
            'div',
            { class: 'shadcn-card p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300' },
            App.h(
                'div',
                { class: 'aspect-square rounded-lg overflow-hidden bg-zinc-950 border border-zinc-900 flex items-center justify-center relative group' },
                App.h('img', {
                    src: img.previewUrl,
                    alt: img.originalName,
                    width: img.width,
                    height: img.height,
                    decoding: 'async',
                    loading: 'lazy',
                    class: 'max-w-full max-h-full object-contain'
                }),
                App.h(
                    'div',
                    { class: 'absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2' },
                    App.h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn-dl-png shadcn-button shadcn-button-primary h-8 px-3 text-[10px] gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            attrs: { 'aria-label': `Download ${img.originalName} as PNG` },
                            on: { click: () => App.downloadFile(img.pngBlob, `unified-${img.originalName}.png`, 'image/png') }
                        },
                        App.h('i', { attrs: { 'data-lucide': 'download' }, class: 'w-3 h-3 pointer-events-none' }),
                        App.h('span', { text: 'PNG' })
                    ),
                    App.h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn-dl-webp shadcn-button shadcn-button-outline h-8 px-3 text-[10px] gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            attrs: { 'aria-label': `Download ${img.originalName} as WebP` },
                            on: { click: () => App.downloadFile(img.webpBlob, `unified-${img.originalName}.webp`, 'image/webp') }
                        },
                        App.h('i', { attrs: { 'data-lucide': 'download' }, class: 'w-3 h-3 pointer-events-none' }),
                        App.h('span', { text: 'WebP' })
                    )
                )
            ),
            App.h(
                'div',
                { class: 'space-y-1' },
                App.h('p', {
                    class: 'text-[10px] font-bold text-white truncate',
                    title: img.originalName,
                    text: img.originalName
                })
            )
        );

        renderIcons(card);
        return card;
    },

    appendResultCard: function(img) {
        const container = document.getElementById('results-section');
        const grid = document.getElementById('results-grid');
        if (!container || !grid) return;

        container.classList.remove('hidden');
        grid.appendChild(this.buildResultCard(img));
    },

    renderResults: function() {
        const container = document.getElementById('results-section');
        const grid = document.getElementById('results-grid');
        if (!container || !grid) return;

        container.classList.remove('hidden');
        const cards = this.processedImages.map(img => this.buildResultCard(img));
        grid.replaceChildren(...cards);
    },

    downloadZip: async function(asWebp = false) {
        if (!this.processedImages.length) return;

        try {
            const mod = await import('jszip');
            const JSZip = mod.default || mod;
            const zip = new JSZip();
            const ext = asWebp ? 'webp' : 'png';
            this.processedImages.forEach(img => {
                const blob = asWebp ? img.webpBlob : img.pngBlob;
                const base = img.originalName.split('.')[0] || img.originalName;
                zip.file(`unified-${base}.${ext}`, blob);
            });

            const content = await zip.generateAsync({ type: 'blob' });
            App.downloadFile(content, `unified-images-${ext}.zip`, 'application/zip');
            App.fireConfetti();
        } catch (err) {
            console.error('Error creating ZIP:', err);
            App.showToast(App.t('msg_zip_failed') || 'Failed to generate ZIP.', { type: 'error' });
        }
    }
});
