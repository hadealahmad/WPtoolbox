import '../main.js';
import { App } from '../core/app.js';
import JSZip from 'jszip';
import { UI } from '../core/ui.js';

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
                document.getElementById('bg-hex').textContent = e.target.value;
            });
        }

        const colorInput = document.getElementById('input-color');
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                document.getElementById('color-hex').textContent = e.target.value;
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
                return { w: parseInt(match[1]), h: parseInt(match[2]) };
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
        
        // Dynamic font size based on height/width
        const fontSize = Math.max(12, Math.min(w, h) * 0.1);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;

        // Text shadow for contrast just in case
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillText(displayText, w / 2, h / 2);
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
            UI.showToast("Please enter valid dimensions", "error");
            return;
        }

        const textInput = document.getElementById('input-text');
        const text = textInput ? textInput.value : '';
        
        const bgInput = document.getElementById('input-bg');
        const bgColor = bgInput ? bgInput.value : '#18181b';
        
        const colorInput = document.getElementById('input-color');
        const textColor = colorInput ? colorInput.value : '#ffffff';

        const btn = document.getElementById('btn-generate');
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Generating...`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons, root: btn});
        btn.disabled = true;

        const zip = new JSZip();
        const offscreenCanvas = document.createElement('canvas');

        for (const dim of dims) {
            this.drawToCanvas(dim.w, dim.h, text, bgColor, textColor, offscreenCanvas);
            
            const blob = await new Promise(resolve => offscreenCanvas.toBlob(resolve, 'image/jpeg', 0.9));
            zip.file(`placeholder_${dim.w}x${dim.h}.jpg`, blob);
        }

        try {
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dummy_images_${Date.now()}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            UI.showToast("Images downloaded successfully!");
            App.fireConfetti();
        } catch (error) {
            console.error("Error creating ZIP:", error);
            UI.showToast("Failed to generate ZIP", "error");
        } finally {
            btn.innerHTML = originalBtnText;
            if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons, root: btn});
            btn.disabled = false;
        }
    }
});
