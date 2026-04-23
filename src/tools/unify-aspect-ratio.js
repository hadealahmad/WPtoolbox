/**
 * Unify Aspect Ratio Tool
 */
import '../main.js';
import { App } from '../core/app.js';
import JSZip from 'jszip';

export const UnifyAspectRatio = App.registerTool('UnifyAspectRatio', {
    targetRatio: 1, // 1:1 default
    customWidth: 1000,
    customHeight: 1000,
    processedImages: [],
    lastFiles: null,
    multiple: true,
    resultsId: 'results-section',

    onInit: function() {
        const ratioBtns = document.querySelectorAll('.ratio-btn');
        const zipBtn = document.getElementById('download-zip-btn');
        const zipWebpBtn = document.getElementById('download-zip-webp-btn');
        const customWidthInput = document.getElementById('custom-width');
        const customHeightInput = document.getElementById('custom-height');
        const customRatioInputs = document.getElementById('custom-ratio-inputs');

        // Ratio button logic
        ratioBtns.forEach(btn => {
            btn.onclick = () => {
                ratioBtns.forEach(b => b.classList.remove('active', 'bg-primary', 'text-primary-foreground'));
                ratioBtns.forEach(b => b.classList.add('bg-zinc-900/50', 'text-white'));
                
                btn.classList.add('active', 'bg-primary', 'text-primary-foreground');
                btn.classList.remove('bg-zinc-900/50', 'text-white');

                const ratio = btn.dataset.ratio;
                if (ratio === 'custom') {
                    if (customRatioInputs) customRatioInputs.classList.remove('hidden');
                    this.updateTargetRatio();
                } else {
                    if (customRatioInputs) customRatioInputs.classList.add('hidden');
                    const [w, h] = ratio.split(':').map(Number);
                    this.targetRatio = w / h;
                }
                
                if (this.lastFiles) {
                    this.handleFiles(this.lastFiles);
                }
            };
        });

        // Custom input logic
        [customWidthInput, customHeightInput].forEach(input => {
            if (input) {
                input.oninput = () => {
                    this.updateTargetRatio();
                    if (this.lastFiles) {
                        this.handleFiles(this.lastFiles);
                    }
                };
            }
        });

        if (zipBtn) zipBtn.onclick = () => this.downloadZip(false);
        if (zipWebpBtn) zipWebpBtn.onclick = () => this.downloadZip(true);

        // Clipboard listener
        document.addEventListener('paste', (e) => this.handlePaste(e));
    },

    onLanguageChange: function() {
        if (this.processedImages.length > 0) this.renderResults();
    },

    onFiles: function(files) {
        this.handleFiles(files);
    },

    updateTargetRatio: function() {
        const wInput = document.getElementById('custom-width');
        const hInput = document.getElementById('custom-height');
        const w = parseInt(wInput?.value) || 1000;
        const h = parseInt(hInput?.value) || 1000;
        this.targetRatio = w / h;
    },

    handlePaste: async function(e) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    await this.handleFiles([file]);
                }
            }
        }
    },

    handleFiles: async function(files) {
        if (!files || !files.length) return;
        this.lastFiles = files;

        // Clear existing results
        this.processedImages = [];

        const progressBar = document.getElementById('processing-bar');
        
        let processed = 0;
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                App.showToast(App.t('msg_upload_images') || 'Please upload only images.');
                continue;
            }

            await this.processImage(file);
            processed++;
            if (progressBar) progressBar.style.width = `${(processed / files.length) * 100}%`;
        }

        setTimeout(() => {
            if (progressBar) progressBar.style.width = '0';
        }, 1000);
    },

    processImage: function(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    let targetWidth, targetHeight;
                    const imgRatio = img.width / img.height;

                    if (imgRatio > this.targetRatio) {
                        targetHeight = img.height;
                        targetWidth = img.height * this.targetRatio;
                    } else {
                        targetWidth = img.width;
                        targetHeight = img.width / this.targetRatio;
                    }

                    canvas.width = targetWidth;
                    canvas.height = targetHeight;

                    const offsetX = (img.width - targetWidth) / 2;
                    const offsetY = (img.height - targetHeight) / 2;

                    ctx.drawImage(img, offsetX, offsetY, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);

                    this.processedImages.push({
                        name: `unified-${file.name}`,
                        png: canvas.toDataURL('image/png'),
                        webp: canvas.toDataURL('image/webp', 0.8),
                        originalName: file.name
                    });

                    this.renderResults();
                    resolve();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    renderResults: function() {
        const container = document.getElementById('results-section');
        const grid = document.getElementById('results-grid');
        if (!container || !grid) return;

        container.classList.remove('hidden');
        grid.innerHTML = '';

        this.processedImages.forEach((img, index) => {
            const card = document.createElement('div');
            card.className = 'shadcn-card p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300';
            card.innerHTML = `
                <div class="aspect-square rounded-lg overflow-hidden bg-zinc-950 border border-zinc-900 flex items-center justify-center relative group">
                    <img src="${img.png}" class="max-w-full max-h-full object-contain">
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                         <button class="btn-dl-png shadcn-button shadcn-button-primary h-8 px-3 text-[10px] gap-2">
                            <i data-lucide="download" class="w-3 h-3"></i>
                            <span>PNG</span>
                        </button>
                        <button class="btn-dl-webp shadcn-button shadcn-button-outline h-8 px-3 text-[10px] gap-2">
                            <i data-lucide="download" class="w-3 h-3"></i>
                            <span>WebP</span>
                        </button>
                    </div>
                </div>
                <div class="space-y-1">
                    <p class="text-[10px] font-bold text-white truncate">${img.originalName}</p>
                </div>
            `;
            card.querySelector('.btn-dl-png').onclick = () => App.downloadFile(img.png, `unified-${img.originalName}.png`, 'image/png');
            card.querySelector('.btn-dl-webp').onclick = () => App.downloadFile(img.webp, `unified-${img.originalName}.webp`, 'image/webp');
            grid.appendChild(card);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
        App.translatePage();
    },

    downloadZip: async function(asWebp = false) {
        if (!this.processedImages.length) return;
        
        const zip = new JSZip();
        this.processedImages.forEach(img => {
            const dataUrl = asWebp ? img.webp : img.png;
            const ext = asWebp ? 'webp' : 'png';
            const base64Data = dataUrl.split(',')[1];
            zip.file(`unified-${img.originalName.split('.')[0]}.${ext}`, base64Data, { base64: true });
        });

        const content = await zip.generateAsync({ type: "blob" });
        App.downloadFile(content, `unified-images-${asWebp ? 'webp' : 'png'}.zip`, 'application/zip');
        App.fireConfetti();
    }
});
