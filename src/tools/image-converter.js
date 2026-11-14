/**
 * WebP Converter / Image Converter Module
 */
import '../main.js';
import { App } from '../core/app.js';
import { createIcons, icons } from 'lucide';
import JSZip from 'jszip';

export const ImageConverter = App.registerTool('ImageConverter', {
    quality: 0.8,
    convertedImages: [],
    multiple: true,
    resultsId: 'results-section',
    progressBarId: 'processing-bar',

    onCleanup: function() {
        if (this._onPaste) {
            document.removeEventListener('paste', this._onPaste);
            this._onPaste = null;
        }
        if (this._progressTimer) {
            clearTimeout(this._progressTimer);
            this._progressTimer = null;
        }
        this.revokePreviewUrls();
    },

    revokePreviewUrls: function() {
        for (const img of this.convertedImages) {
            if (img.previewUrl) {
                URL.revokeObjectURL(img.previewUrl);
                img.previewUrl = null;
            }
        }
    },

    onInit: function() {
        const qualitySlider = document.getElementById('quality-slider');
        const qualityValue = document.getElementById('quality-value');
        const zipBtn = document.getElementById('download-zip-btn');
        const browseBtn = document.getElementById('browse-files-btn');
        const fileInput = document.getElementById('file-input');

        if (qualitySlider) {
            qualitySlider.oninput = (e) => {
                this.quality = parseFloat(e.target.value);
                if (qualityValue) qualityValue.textContent = `${Math.round(this.quality * 100)}%`;
            };
        }

        if (browseBtn && fileInput) {
            browseBtn.addEventListener('click', () => fileInput.click());
        }

        if (zipBtn) {
            zipBtn.onclick = () => this.downloadZip();
        }

        // Clipboard listener (removed on teardown via onCleanup)
        this._onPaste = (e) => {
            const target = e.target;
            if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
            this.handlePaste(e);
        };
        document.addEventListener('paste', this._onPaste);
    },

    onLanguageChange: function() {
        if (this.convertedImages.length > 0) this.renderResults();
    },

    onFiles: function(files) {
        return this.handleFiles(files);
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

        const progressBar = document.getElementById(this.config.progressBarId);
        if (this._progressTimer) {
            clearTimeout(this._progressTimer);
            this._progressTimer = null;
        }
        this.isCancelled = false;

        const maybeYield = App.createYielder();
        const total = files.length;
        let processed = 0;
        let rejected = 0;

        for (const file of files) {
            if (this.isCancelled) break;

            if (!file.type.startsWith('image/')) {
                rejected++;
                processed++;
                if (progressBar) progressBar.style.width = `${(processed / total) * 100}%`;
                await maybeYield();
                continue;
            }

            let tempName = file.name;
            if (!tempName || tempName === 'image.png') {
                const timestamp = Date.now();
                const ext = file.type.split('/')[1] || 'png';
                tempName = `pasted-image-${timestamp}.${ext}`;
            }

            try {
                const item = await this.processImage(file, tempName);
                this.convertedImages.push(item);
                this.appendResultCard(item);
            } catch (err) {
                console.error('Error converting image:', file.name, err);
                rejected++;
            }

            processed++;
            if (progressBar) progressBar.style.width = `${(processed / total) * 100}%`;
            await maybeYield();
        }

        if (rejected > 0) {
            App.showToast(App.t('msg_upload_images') || 'Please upload only images.', { type: 'error' });
        }

        this._progressTimer = setTimeout(() => {
            if (progressBar) progressBar.style.width = '0';
            this._progressTimer = null;
        }, 1000);
    },

    processImage: async function(file, outputName) {
        const name = outputName || file.name;
        const bitmap = await createImageBitmap(file);
        try {
            let width = bitmap.width;
            let height = bitmap.height;

            // Smart Resizing
            const resizeToggle = document.getElementById('resize-toggle');
            if (resizeToggle && resizeToggle.checked) {
                const maxDim = 2000;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, width, height);

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob((result) => {
                    if (result) resolve(result);
                    else reject(new Error('Failed to encode WebP image'));
                }, 'image/webp', this.quality);
            });

            const previewUrl = URL.createObjectURL(blob);
            const dotIndex = name.lastIndexOf('.');
            const baseName = dotIndex > 0 ? name.substring(0, dotIndex) : name;

            return {
                name: `${baseName}.webp`,
                blob,
                previewUrl,
                width,
                height,
                originalSize: file.size,
                newSize: blob.size
            };
        } finally {
            bitmap.close();
        }
    },

    buildResultCard: function(img) {
        const savings = img.originalSize > 0
            ? Math.round((1 - (img.newSize / img.originalSize)) * 100)
            : 0;
        const downloadLabel = App.t('btn_download') || 'Download';

        const card = App.h(
            'div',
            { class: 'shadcn-card p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300' },
            App.h(
                'div',
                { class: 'aspect-square rounded-lg overflow-hidden bg-zinc-950 border border-zinc-900 flex items-center justify-center relative group' },
                App.h('img', {
                    src: img.previewUrl,
                    alt: img.name,
                    width: img.width,
                    height: img.height,
                    decoding: 'async',
                    loading: 'lazy',
                    class: 'max-w-full max-h-full object-contain'
                }),
                App.h(
                    'div',
                    { class: 'absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center' },
                    App.h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn-download-single shadcn-button shadcn-button-primary h-8 px-3 text-[10px] gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            attrs: { 'aria-label': `${downloadLabel} ${img.name}` },
                            on: { click: () => App.downloadFile(img.blob, img.name, 'image/webp') }
                        },
                        App.h('i', { attrs: { 'data-lucide': 'download' }, class: 'w-3 h-3 pointer-events-none' }),
                        App.h('span', { attrs: { 'data-i18n': 'btn_download' }, text: downloadLabel })
                    )
                )
            ),
            App.h(
                'div',
                { class: 'space-y-1' },
                App.h('p', {
                    class: 'text-[10px] font-bold text-white truncate',
                    title: img.name,
                    text: img.name
                }),
                App.h(
                    'div',
                    { class: 'flex justify-between items-center text-[9px]' },
                    App.h('span', { class: 'text-zinc-500', text: App.formatSize(img.newSize) }),
                    App.h('span', { class: 'text-emerald-500 font-bold', text: `-${savings}%` })
                )
            )
        );

        createIcons({ icons, root: card });
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
        const cards = this.convertedImages.map(img => this.buildResultCard(img));
        grid.replaceChildren(...cards);
    },

    downloadZip: async function() {
        if (!this.convertedImages.length) return;

        const zip = new JSZip();
        this.convertedImages.forEach(img => {
            zip.file(img.name, img.blob);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        App.downloadFile(content, 'converted-images.zip', 'application/zip');
        App.fireConfetti();
    }
});
