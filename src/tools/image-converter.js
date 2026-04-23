/**
 * WebP Converter / Image Converter Module
 */
import '../main.js';
import { App } from '../core/app.js';
import JSZip from 'jszip';

export const ImageConverter = App.registerTool('ImageConverter', {
    quality: 0.8,
    convertedImages: [],
    multiple: true,
    resultsId: 'results-section',

    onInit: function() {
        const qualitySlider = document.getElementById('quality-slider');
        const qualityValue = document.getElementById('quality-value');
        const zipBtn = document.getElementById('download-zip-btn');

        if (qualitySlider) {
            qualitySlider.oninput = (e) => {
                this.quality = parseFloat(e.target.value);
                if (qualityValue) qualityValue.textContent = `${Math.round(this.quality * 100)}%`;
            };
        }

        if (zipBtn) {
            zipBtn.onclick = () => this.downloadZip();
        }

        // Add clipboard listener
        document.addEventListener('paste', (e) => this.handlePaste(e));
    },

    onLanguageChange: function() {
        if (this.convertedImages.length > 0) this.renderResults();
    },

    onFiles: function(files) {
        this.handleFiles(files);
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

        // Clear existing results
        this.convertedImages = [];

        const progressBar = document.getElementById('processing-bar');
        
        let processed = 0;
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                App.showToast(App.t('msg_upload_images') || 'Please upload only images.');
                continue;
            }

            let tempName = file.name;
            if (!tempName || tempName === 'image.png') {
                const timestamp = new Date().getTime();
                const ext = file.type.split('/')[1] || 'png';
                tempName = `pasted-image-${timestamp}.${ext}`;
            }

            await this.processImage(file, tempName);
            processed++;
            if (progressBar) progressBar.style.width = `${(processed / files.length) * 100}%`;
        }

        setTimeout(() => {
            if (progressBar) progressBar.style.width = '0';
        }, 1000);
    },

    processImage: function(file, outputName) {
        return new Promise((resolve) => {
            const name = outputName || file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

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

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataURL = canvas.toDataURL('image/webp', this.quality);
                    const baseName = name.substring(0, name.lastIndexOf('.')) || name;
                    
                    this.convertedImages.push({
                        name: `${baseName}.webp`,
                        dataURL: dataURL,
                        originalSize: file.size,
                        newSize: Math.round((dataURL.length - 22) * 3 / 4)
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

        this.convertedImages.forEach((img, index) => {
            const savings = Math.round((1 - (img.newSize / img.originalSize)) * 100);
            const card = document.createElement('div');
            card.className = 'shadcn-card p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300';
            card.innerHTML = `
                <div class="aspect-square rounded-lg overflow-hidden bg-zinc-950 border border-zinc-900 flex items-center justify-center relative group">
                    <img src="${img.dataURL}" class="max-w-full max-h-full object-contain">
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button class="btn-download-single shadcn-button shadcn-button-primary h-8 px-3 text-[10px] gap-2">
                            <i data-lucide="download" class="w-3 h-3"></i>
                            <span data-i18n="btn_download">Download</span>
                        </button>
                    </div>
                </div>
                <div class="space-y-1">
                    <p class="text-[10px] font-bold text-white truncate">${img.name}</p>
                    <div class="flex justify-between items-center text-[9px]">
                        <span class="text-zinc-500">${App.formatSize(img.newSize)}</span>
                        <span class="text-emerald-500 font-bold">-${savings}%</span>
                    </div>
                </div>
            `;
            card.querySelector('.btn-download-single').onclick = () => App.downloadFile(img.dataURL, img.name, 'image/webp');
            grid.appendChild(card);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
        App.translatePage();
    },

    downloadZip: async function() {
        if (!this.convertedImages.length) return;
        
        const zip = new JSZip();
        this.convertedImages.forEach(img => {
            const base64Data = img.dataURL.split(',')[1];
            zip.file(img.name, base64Data, { base64: true });
        });

        const content = await zip.generateAsync({ type: "blob" });
        App.downloadFile(content, 'converted-images.zip', 'application/zip');
        App.fireConfetti();
    }
});
