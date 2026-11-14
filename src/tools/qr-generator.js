/**
 * QR Code Generator Tool
 */
import '../main.js';
import { App } from '../core/app.js';
import { Utils } from '../core/utils.js';
import { createIcons, icons } from 'lucide';
import JSZip from 'jszip';
import QRCode from 'qrcode';

function getValidFilename(urlStr) {
    try {
        const urlToParse = urlStr.startsWith('http') ? urlStr : 'https://' + urlStr;
        const u = new URL(urlToParse);
        let path = u.pathname;
        if (path === '/') path = '';
        let str = u.hostname + path;
        str = str.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        return str || 'qr-code';
    } catch {
        const str = String(urlStr).replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        return str || 'qr-code';
    }
}

function canvasToBlob(canvas, type = 'image/png') {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error(`Failed to encode ${type}`));
        }, type);
    });
}

export const QRGenerator = App.registerTool('QRGenerator', {
    progressBarId: 'processing-bar',
    processedQRs: [],
    multiple: false,
    resultsId: 'results-section',
    customBgFile: null,

    onCleanup: function() {
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
            this.previewTimeout = null;
        }
        if (this._progressTimer) {
            clearTimeout(this._progressTimer);
            this._progressTimer = null;
        }
        if (this._customBgObjectUrl) {
            URL.revokeObjectURL(this._customBgObjectUrl);
            this._customBgObjectUrl = null;
        }
        if (this._socialPreviewUrl) {
            URL.revokeObjectURL(this._socialPreviewUrl);
            this._socialPreviewUrl = null;
        }
        this.revokeQRUrls();
    },

    revokeQRUrls: function() {
        for (const qr of this.processedQRs) {
            if (qr.previewUrl) {
                URL.revokeObjectURL(qr.previewUrl);
                qr.previewUrl = null;
            }
        }
    },

    onInit: function() {
        const generateBtn = document.getElementById('generate-btn');
        const downloadAllBtn = document.getElementById('download-all-btn');

        if (generateBtn) generateBtn.onclick = () => this.handleGenerate();
        if (downloadAllBtn) downloadAllBtn.onclick = () => this.downloadZip();

        this.initSocialOptions();
    },

    initSocialOptions: function() {
        const enableSocial = document.getElementById('enable-social');
        const socialOptions = document.getElementById('social-options');
        const bgType = document.getElementById('bg-type');
        const gradientOptions = document.getElementById('gradient-options');
        const imageOptions = document.getElementById('image-options');
        const imageUpload = document.getElementById('bg-image-upload');
        const imagePreview = document.getElementById('bg-image-preview');
        const uploadPrompt = document.getElementById('bg-upload-prompt');

        if (enableSocial && socialOptions) {
            enableSocial.addEventListener('change', (e) => {
                if (e.target.checked) {
                    socialOptions.classList.remove('hidden');
                } else {
                    socialOptions.classList.add('hidden');
                }
            });
        }

        if (bgType) {
            bgType.addEventListener('change', (e) => {
                if (e.target.value === 'gradient') {
                    gradientOptions?.classList.remove('hidden');
                    imageOptions?.classList.add('hidden');
                } else {
                    gradientOptions?.classList.add('hidden');
                    imageOptions?.classList.remove('hidden');
                }
            });
        }

        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    if (this._customBgObjectUrl) {
                        URL.revokeObjectURL(this._customBgObjectUrl);
                    }
                    const objectUrl = URL.createObjectURL(file);
                    this._customBgObjectUrl = objectUrl;
                    this.customBgFile = file;

                    if (imagePreview) {
                        imagePreview.src = objectUrl;
                        imagePreview.classList.remove('hidden');
                    }
                    if (uploadPrompt) {
                        uploadPrompt.classList.remove('opacity-100');
                        uploadPrompt.classList.add('opacity-0');
                    }
                    if (this.updatePreview) this.updatePreview();
                }
            });
        }

        const updatePreview = async () => {
            if (!enableSocial || !enableSocial.checked) {
                document.getElementById('social-preview-container')?.classList.add('hidden');
                return;
            }

            const previewContainer = document.getElementById('social-preview-container');
            const previewImg = document.getElementById('social-preview-img');
            if (previewContainer) previewContainer.classList.remove('hidden');

            const linksInput = document.getElementById('links-input');
            const lines = linksInput ? linksInput.value.trim().split('\n').filter(l => l.trim()) : [];
            const previewLink = lines.length > 0 ? lines[0] : 'https://example.com';

            const aspectRatioVal = document.getElementById('aspect-ratio')?.value || '1:1';
            const bgTypeVal = document.getElementById('bg-type')?.value || 'gradient';
            const titleText = document.getElementById('qr-title')?.value || '';
            const showLink = document.getElementById('show-link')?.checked;

            const transparentBg = document.getElementById('transparent-bg');
            const isTransparent = transparentBg && transparentBg.checked;
            const bgOption = isTransparent ? '#00000000' : '#ffffff';

            try {
                const qrCanvas = document.createElement('canvas');
                await QRCode.toCanvas(qrCanvas, previewLink, {
                    color: { light: bgOption, dark: '#000000' },
                    margin: 2,
                    width: 600
                });

                const { blob, width, height } = await this.generateSocialImage(
                    qrCanvas,
                    aspectRatioVal,
                    bgTypeVal,
                    titleText,
                    showLink,
                    previewLink
                );

                if (previewImg) {
                    if (this._socialPreviewUrl) {
                        URL.revokeObjectURL(this._socialPreviewUrl);
                    }
                    this._socialPreviewUrl = URL.createObjectURL(blob);
                    previewImg.src = this._socialPreviewUrl;
                    previewImg.width = width;
                    previewImg.height = height;
                }
            } catch (err) {
                console.error('Preview error:', err);
            }
        };

        this.updatePreview = updatePreview;

        const inputs = [
            'enable-social', 'aspect-ratio', 'bg-type', 'qr-title', 'show-link', 'transparent-bg'
        ];
        inputs.forEach(id => {
            document.getElementById(id)?.addEventListener('change', updatePreview);
            document.getElementById(id)?.addEventListener('input', updatePreview);
        });

        document.getElementById('links-input')?.addEventListener('input', () => {
            clearTimeout(this.previewTimeout);
            this.previewTimeout = setTimeout(updatePreview, 500);
        });

        this.renderGradientPresets();
    },

    renderGradientPresets: function() {
        const container = document.getElementById('gradient-options');
        if (!container) return;

        this.gradients = [
            ['oklch(0.65 0.2 20)', 'oklch(0.75 0.2 60)'],
            ['oklch(0.7 0.1 250)', 'oklch(0.8 0.15 320)'],
            ['oklch(0.75 0.15 140)', 'oklch(0.85 0.15 80)'],
            ['oklch(0.6 0.15 250)', 'oklch(0.6 0.15 200)'],
            ['oklch(0.4 0.1 280)', 'oklch(0.6 0.15 320)'],
            ['oklch(0.8 0.1 80)', 'oklch(0.9 0.1 100)'],
            ['oklch(0.3 0.05 250)', 'oklch(0.2 0.05 250)'],
            ['oklch(0.9 0.05 180)', 'oklch(0.8 0.1 200)'],
        ];

        if (this.selectedGradientIndex === undefined) {
            this.selectedGradientIndex = 1;
        }

        const buttons = this.gradients.map((grad, index) => {
            const isSelected = index === this.selectedGradientIndex;
            return App.h('button', {
                type: 'button',
                class: `w-8 h-8 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}`,
                style: { background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` },
                attrs: {
                    'aria-label': `Gradient preset ${index + 1}`,
                    'aria-pressed': isSelected ? 'true' : 'false'
                },
                on: {
                    click: () => {
                        this.selectedGradientIndex = index;
                        this.renderGradientPresets();
                        if (this.updatePreview) this.updatePreview();
                    }
                }
            });
        });

        container.replaceChildren(...buttons);
    },

    onLanguageChange: function() {
        if (this.processedQRs.length > 0) this.renderResults();
    },

    handleGenerate: async function() {
        const linksInput = document.getElementById('links-input');
        const transparentBg = document.getElementById('transparent-bg');
        if (!linksInput) return;

        const text = linksInput.value.trim();
        if (!text) {
            App.showToast(App.t('msg_enter_links') || 'Please enter at least one link.', { type: 'error' });
            return;
        }

        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return;

        const enableSocial = document.getElementById('enable-social')?.checked;
        const aspectRatioVal = document.getElementById('aspect-ratio')?.value || '1:1';
        const bgTypeVal = document.getElementById('bg-type')?.value || 'gradient';
        const titleText = document.getElementById('qr-title')?.value || '';
        const showLink = document.getElementById('show-link')?.checked;

        const isTransparent = !!(transparentBg && transparentBg.checked);
        const bgOption = isTransparent ? '#00000000' : '#ffffff';

        if (this._progressTimer) {
            clearTimeout(this._progressTimer);
            this._progressTimer = null;
        }

        // UI Setup
        document.getElementById('empty-state')?.classList.add('hidden');
        document.getElementById('results-section')?.classList.remove('hidden');

        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) progressContainer.classList.remove('hidden');
        this.updateProgress(0);

        const grid = document.getElementById('results-grid');
        if (grid) grid.replaceChildren();

        this.revokeQRUrls();
        this.processedQRs = [];

        const maybeYield = App.createYielder();
        const qrCanvas = document.createElement('canvas');
        let processed = 0;

        for (const line of lines) {
            try {
                const name = getValidFilename(line);

                // SVG String
                const svgString = await QRCode.toString(line, {
                    type: 'svg',
                    color: { light: bgOption, dark: '#000000' },
                    margin: 1
                });

                const qrWidth = enableSocial ? 600 : 512;
                await QRCode.toCanvas(qrCanvas, line, {
                    color: { light: bgOption, dark: '#000000' },
                    margin: 2,
                    width: qrWidth
                });

                let pngBlob;
                let width = qrCanvas.width;
                let height = qrCanvas.height;

                if (enableSocial) {
                    const socialResult = await this.generateSocialImage(
                        qrCanvas,
                        aspectRatioVal,
                        bgTypeVal,
                        titleText,
                        showLink,
                        line
                    );
                    pngBlob = socialResult.blob;
                    width = socialResult.width;
                    height = socialResult.height;
                } else {
                    pngBlob = await canvasToBlob(qrCanvas, 'image/png');
                }

                const previewUrl = URL.createObjectURL(pngBlob);
                const item = {
                    content: line,
                    name,
                    svg: svgString,
                    pngBlob,
                    previewUrl,
                    width,
                    height,
                    isSocial: !!enableSocial,
                    isTransparent
                };

                this.processedQRs.push(item);
                if (grid) {
                    grid.appendChild(this.buildResultCard(item, this.processedQRs.length - 1));
                }

                processed++;
                this.updateProgress(Math.round((processed / lines.length) * 100));
                await maybeYield();
            } catch (err) {
                console.error(err);
            }
        }

        this._progressTimer = setTimeout(() => {
            if (progressContainer) progressContainer.classList.add('hidden');
            this._progressTimer = null;
        }, 500);

        App.fireConfetti();
    },

    generateSocialImage: async function(qrCanvas, ratio, bgType, titleText, showLink, linkText) {
        const dimensions = {
            '1:1': { w: 1080, h: 1080 },
            '4:5': { w: 1080, h: 1350 },
            '16:9': { w: 1200, h: 675 },
            '9:16': { w: 1080, h: 1920 }
        };
        const dim = dimensions[ratio] || dimensions['1:1'];

        const canvas = document.createElement('canvas');
        canvas.width = dim.w;
        canvas.height = dim.h;
        const ctx = canvas.getContext('2d');

        if (bgType === 'image' && this.customBgFile) {
            try {
                const bgBitmap = await createImageBitmap(this.customBgFile);
                try {
                    const scale = Math.max(dim.w / bgBitmap.width, dim.h / bgBitmap.height);
                    const x = (dim.w / 2) - (bgBitmap.width / 2) * scale;
                    const y = (dim.h / 2) - (bgBitmap.height / 2) * scale;
                    ctx.drawImage(bgBitmap, x, y, bgBitmap.width * scale, bgBitmap.height * scale);
                } finally {
                    bgBitmap.close();
                }
            } catch {
                this.drawGradientBg(ctx, dim);
            }
        } else {
            this.drawGradientBg(ctx, dim);
        }

        const qrSize = Math.min(dim.w, dim.h) * 0.5;

        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 10;

        ctx.fillStyle = '#ffffff';
        const padding = 40;
        const rectSize = qrSize + padding * 2;
        const rectX = (dim.w - rectSize) / 2;
        const rectY = (dim.h - rectSize) / 2;

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(rectX, rectY, rectSize, rectSize, 32);
        } else {
            ctx.rect(rectX, rectY, rectSize, rectSize);
        }
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.drawImage(qrCanvas, (dim.w - qrSize) / 2, (dim.h - qrSize) / 2, qrSize, qrSize);

        const drawTextPill = (text, y, fontSize, isBottom) => {
            ctx.direction = Utils.isArabic(text) ? 'rtl' : 'ltr';
            ctx.font = `bold ${fontSize}px 'IBM Plex Sans Arabic', Inter, sans-serif`;

            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const paddingX = fontSize * 1.2;
            const paddingY = fontSize * 0.6;
            const pillWidth = textWidth + paddingX * 2;
            const pillHeight = fontSize + paddingY * 2;
            const pillX = (dim.w - pillWidth) / 2;
            const pillY = isBottom ? y : y - pillHeight;

            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 10;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
            } else {
                ctx.rect(pillX, pillY, pillWidth, pillHeight);
            }
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, dim.w / 2, pillY + pillHeight / 2 + (fontSize * 0.05));

            ctx.direction = 'ltr';
        };

        if (titleText) {
            const fontSize = Math.floor(dim.w * 0.06);
            drawTextPill(titleText, rectY - 40, fontSize, false);
        }

        if (showLink && linkText) {
            const fontSize = Math.floor(dim.w * 0.035);
            let cleanLink = linkText.replace(/^https?:\/\//, '').replace(/\/$/, '');

            ctx.font = `bold ${fontSize}px 'IBM Plex Sans Arabic', Inter, sans-serif`;
            const maxAllowedWidth = dim.w * 0.85;
            const linkWidth = ctx.measureText(cleanLink).width;

            if (linkWidth > maxAllowedWidth) {
                try {
                    const u = new URL(linkText.startsWith('http') ? linkText : 'https://' + linkText);
                    cleanLink = u.hostname;
                } catch {
                    cleanLink = cleanLink.split('/')[0];
                }
            }

            drawTextPill(cleanLink, rectY + rectSize + 40, fontSize, true);
        }

        const blob = await canvasToBlob(canvas, 'image/png');
        return { blob, width: dim.w, height: dim.h };
    },

    drawGradientBg: function(ctx, dim) {
        const gradColors = this.gradients[this.selectedGradientIndex] || this.gradients[1];
        const gradient = ctx.createLinearGradient(0, 0, dim.w, dim.h);
        gradient.addColorStop(0, gradColors[0]);
        gradient.addColorStop(1, gradColors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, dim.w, dim.h);
    },

    buildResultCard: function(qr, index) {
        const bgClass = qr.isSocial
            ? 'bg-zinc-900 border border-zinc-800'
            : (qr.isTransparent ? 'bg-checkered' : 'bg-white');
        const imgClass = qr.isSocial
            ? 'w-full h-full object-contain rounded-lg'
            : 'w-full h-full object-contain';

        const card = App.h(
            'div',
            {
                class: 'shadcn-card p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300',
                style: { animationDelay: `${Math.min(index, 12) * 50}ms` }
            },
            App.h(
                'div',
                { class: `aspect-square rounded-xl ${bgClass} p-4 flex items-center justify-center shadow-inner group relative overflow-hidden` },
                App.h('img', {
                    src: qr.previewUrl,
                    alt: `QR code for ${qr.name}`,
                    width: qr.width,
                    height: qr.height,
                    decoding: 'async',
                    loading: 'lazy',
                    class: imgClass
                }),
                App.h(
                    'div',
                    { class: 'absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all flex flex-col items-center justify-center gap-3' },
                    App.h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn-dl-png shadcn-button shadcn-button-primary h-8 px-4 text-[10px] gap-2 w-32 justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            attrs: { 'aria-label': `Download ${qr.name} as PNG` },
                            on: { click: () => App.downloadFile(qr.pngBlob, `${qr.name}.png`, 'image/png') }
                        },
                        App.h('i', { attrs: { 'data-lucide': 'image' }, class: 'w-3 h-3 pointer-events-none' }),
                        App.h('span', { text: 'PNG' })
                    ),
                    App.h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn-dl-svg shadcn-button shadcn-button-outline h-8 px-4 text-[10px] gap-2 w-32 justify-center bg-white/10 text-white border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            attrs: { 'aria-label': `Download ${qr.name} as SVG` },
                            on: { click: () => App.downloadFile(qr.svg, `${qr.name}.svg`, 'image/svg+xml') }
                        },
                        App.h('i', { attrs: { 'data-lucide': 'file-code' }, class: 'w-3 h-3 pointer-events-none' }),
                        App.h('span', { text: 'SVG (Vector)' })
                    )
                )
            ),
            App.h(
                'div',
                { class: 'space-y-1 text-center' },
                App.h('p', {
                    class: 'text-[10px] font-bold text-white truncate max-w-full',
                    title: qr.name,
                    text: qr.name
                }),
                App.h('p', {
                    class: 'text-[8px] text-zinc-600 truncate',
                    title: qr.content,
                    text: qr.content
                })
            )
        );

        createIcons({ icons, root: card });
        return card;
    },

    renderResults: function() {
        const grid = document.getElementById('results-grid');
        if (!grid) return;

        const cards = this.processedQRs.map((qr, index) => this.buildResultCard(qr, index));
        grid.replaceChildren(...cards);
    },

    downloadZip: async function() {
        if (!this.processedQRs.length) return;

        const zip = new JSZip();
        this.processedQRs.forEach(qr => {
            zip.file(`${qr.name}.png`, qr.pngBlob);
            zip.file(`${qr.name}.svg`, qr.svg);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        App.downloadFile(content, 'qr-codes.zip', 'application/zip');
        App.fireConfetti();
    }
});
