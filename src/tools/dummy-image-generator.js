import '../main.js';
import { App } from '../core/app.js';
import { Utils } from '../core/utils.js';
import { createIcons, icons } from 'lucide';
import JSZip from 'jszip';

export const DummyImageGenerator = App.registerTool('DummyImageGenerator', {
    canvas: null,
    ctx: null,

    onInit: function() {
        this.canvas = document.getElementById('preview-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
        this.bindEvents();
        this.updatePreview();
    },

    bindEvents: function() {
        const inputs = ['input-dimensions', 'input-text', 'input-bg', 'input-color'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updatePreview());
            }
        });

        const bgInput = document.getElementById('input-bg');
        if (bgInput) {
            bgInput.addEventListener('input', (e) => {
                const bgHex = document.getElementById('bg-hex');
                if (bgHex) bgHex.textContent = e.target.value;
            });
        }

        const colorInput = document.getElementById('input-color');
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                const colorHex = document.getElementById('color-hex');
                if (colorHex) colorHex.textContent = e.target.value;
            });
        }

        const genBtn = document.getElementById('btn-generate');
        if (genBtn) {
            genBtn.addEventListener('click', () => this.generateBatch());
        }
    },

    getDimensions: function() {
        const input = document.getElementById('input-dimensions');
        if (!input) return [{ w: 1200, h: 630 }];
        const val = input.value.trim();
        if (!val) return [{ w: 1200, h: 630 }];

        return val.split('\n').map(line => {
            const match = line.toLowerCase().match(/(\d+)\s*x\s*(\d+)/);
            if (match) {
                const w = parseInt(match[1], 10);
                const h = parseInt(match[2], 10);
                if (w > 0 && h > 0) {
                    return { w: Math.min(w, 8192), h: Math.min(h, 8192) };
                }
            }
            return null;
        }).filter(Boolean);
    },

    drawToCanvas: function(w, h, text, bgColor, textColor, canvasEl) {
        if (!canvasEl) return;
        canvasEl.width = w;
        canvasEl.height = h;
        const ctx = canvasEl.getContext('2d');

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);

        // Text
        const displayText = text || `${w} x ${h}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.direction = Utils.isArabic(displayText) ? 'rtl' : 'ltr';

        // Dynamic font size based on height/width
        const fontSize = Math.max(12, Math.min(w, h) * 0.1);
        ctx.font = `bold ${fontSize}px 'IBM Plex Sans Arabic', Inter, sans-serif`;

        // Text shadow for contrast just in case
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillText(displayText, w / 2, h / 2);
        ctx.direction = 'ltr';
    },

    updatePreview: function() {
        if (!this.canvas) return;
        const dims = this.getDimensions();
        if (dims.length === 0) return;

        const { w, h } = dims[0]; // Preview the first one

        const textInput = document.getElementById('input-text');
        const text = textInput ? textInput.value : '';

        const bgInput = document.getElementById('input-bg');
        const bgColor = bgInput ? bgInput.value : '#18181b';

        const colorInput = document.getElementById('input-color');
        const textColor = colorInput ? colorInput.value : '#ffffff';

        const placeholder = document.getElementById('preview-placeholder');
        if (placeholder) placeholder.classList.add('hidden');

        this.canvas.classList.remove('hidden');
        this.drawToCanvas(w, h, text, bgColor, textColor, this.canvas);
    },

    generateBatch: async function() {
        const dims = this.getDimensions();
        if (dims.length === 0) {
            App.showToast('Please enter valid dimensions', { type: 'error' });
            return;
        }

        const textInput = document.getElementById('input-text');
        const text = textInput ? textInput.value : '';

        const bgInput = document.getElementById('input-bg');
        const bgColor = bgInput ? bgInput.value : '#18181b';

        const colorInput = document.getElementById('input-color');
        const textColor = colorInput ? colorInput.value : '#ffffff';

        const btn = document.getElementById('btn-generate');
        const originalNodes = btn ? Array.from(btn.childNodes) : [];
        if (btn) {
            btn.replaceChildren(
                App.h('i', { attrs: { 'data-lucide': 'loader-2' }, class: 'w-5 h-5 animate-spin' }),
                App.h('span', { text: 'Generating...' })
            );
            createIcons({ icons, root: btn });
            btn.disabled = true;
        }

        try {
            const zip = new JSZip();
            const offscreenCanvas = document.createElement('canvas');
            const maybeYield = App.createYielder();

            for (const dim of dims) {
                this.drawToCanvas(dim.w, dim.h, text, bgColor, textColor, offscreenCanvas);

                const blob = await new Promise(resolve => offscreenCanvas.toBlob(resolve, 'image/jpeg', 0.9));
                if (blob) {
                    zip.file(`placeholder_${dim.w}x${dim.h}.jpg`, blob);
                }
                await maybeYield();
            }

            const content = await zip.generateAsync({ type: 'blob' });
            App.downloadFile(content, `dummy_images_${Date.now()}.zip`, 'application/zip');
            App.showToast('Images downloaded successfully!', { type: 'success' });
            App.fireConfetti();
        } catch (error) {
            console.error('Error creating ZIP:', error);
            App.showToast('Failed to generate ZIP', { type: 'error' });
        } finally {
            if (btn) {
                btn.replaceChildren(...originalNodes);
                createIcons({ icons, root: btn });
                btn.disabled = false;
            }
        }
    }
});
