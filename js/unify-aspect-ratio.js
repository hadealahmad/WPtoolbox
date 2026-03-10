let aspectR;

const UnifyAspectRatio = {
    targetRatio: 1, // 1:1 default
    customWidth: 1000,
    customHeight: 1000,
    processedImages: [],
    lastFiles: null,

    init: () => {
        aspectR = App.registerTool('UnifyAspectRatio', {
            multiple: true,
            resultsId: 'results-section',
            onFiles: (files) => UnifyAspectRatio.handleFiles(files),
            onLanguageChange: () => {
                if (UnifyAspectRatio.processedImages.length > 0) UnifyAspectRatio.renderResults();
            }
        });

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
                    UnifyAspectRatio.updateTargetRatio();
                } else {
                    if (customRatioInputs) customRatioInputs.classList.add('hidden');
                    const [w, h] = ratio.split(':').map(Number);
                    UnifyAspectRatio.targetRatio = w / h;
                }
                
                if (UnifyAspectRatio.lastFiles) {
                    UnifyAspectRatio.handleFiles(UnifyAspectRatio.lastFiles);
                }
            };
        });

        // Custom input logic
        [customWidthInput, customHeightInput].forEach(input => {
            if (input) {
                input.oninput = () => {
                    UnifyAspectRatio.updateTargetRatio();
                    if (UnifyAspectRatio.lastFiles) {
                        UnifyAspectRatio.handleFiles(UnifyAspectRatio.lastFiles);
                    }
                };
            }
        });

        if (zipBtn) zipBtn.onclick = () => UnifyAspectRatio.downloadZip(false);
        if (zipWebpBtn) zipWebpBtn.onclick = () => UnifyAspectRatio.downloadZip(true);

        // Clipboard listener
        document.addEventListener('paste', UnifyAspectRatio.handlePaste);
    },

    updateTargetRatio: () => {
        const wInput = document.getElementById('custom-width');
        const hInput = document.getElementById('custom-height');
        const w = parseInt(wInput?.value) || 1000;
        const h = parseInt(hInput?.value) || 1000;
        UnifyAspectRatio.targetRatio = w / h;
    },

    handlePaste: async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    await UnifyAspectRatio.handleFiles([file]);
                }
            }
        }
    },

    handleFiles: async (files) => {
        if (!files.length) return;
        UnifyAspectRatio.lastFiles = files;

        const progressBar = document.getElementById('processing-bar');
        UnifyAspectRatio.processedImages = [];

        let processed = 0;
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                App.showToast(App.t('msg_upload_images'));
                continue;
            }

            let tempName = file.name;
            if (!tempName || tempName === 'image.png') {
                const timestamp = new Date().getTime();
                const ext = file.type.split('/')[1] || 'png';
                tempName = `pasted-image-${timestamp}.${ext}`;
            }

            await UnifyAspectRatio.processImage(file, tempName);
            processed++;
            if (progressBar) progressBar.style.width = `${(processed / files.length) * 100}%`;
        }

        setTimeout(() => {
            if (progressBar) progressBar.style.width = '0';
        }, 1000);
    },

    processImage: (file, outputName) => {
        return new Promise((resolve) => {
            const name = outputName || file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const imgW = img.width;
                    const imgH = img.height;
                    const imgRatio = imgW / imgH;

                    let targetW, targetH;

                    if (imgRatio > UnifyAspectRatio.targetRatio) {
                        targetW = imgW;
                        targetH = imgW / UnifyAspectRatio.targetRatio;
                    } else {
                        targetH = imgH;
                        targetW = imgH * UnifyAspectRatio.targetRatio;
                    }

                    canvas.width = targetW;
                    canvas.height = targetH;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, targetW, targetH);

                    const xOffset = (targetW - imgW) / 2;
                    const yOffset = (targetH - imgH) / 2;
                    ctx.drawImage(img, xOffset, yOffset, imgW, imgH);

                    const baseName = name.split('.')[0];
                    
                    canvas.toBlob((webpBlob) => {
                        canvas.toBlob((pngBlob) => {
                            UnifyAspectRatio.processedImages.push({
                                name: baseName,
                                webpBlob: webpBlob,
                                pngBlob: pngBlob,
                                originalExt: file.type.split('/')[1] || 'png',
                                previewUrl: URL.createObjectURL(webpBlob)
                            });
                            UnifyAspectRatio.renderResults();
                            resolve();
                        }, 'image/png', 1.0);
                    }, 'image/webp', 0.9);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    renderResults: () => {
        const container = document.getElementById('images-container');
        if (!container) return;
        container.innerHTML = '';

        UnifyAspectRatio.processedImages.forEach((img, idx) => {
            const card = document.createElement('div');
            card.className = 'shadcn-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300';
            card.innerHTML = `
                <div class="flex items-center gap-4 w-full">
                    <div class="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                        <img src="${img.previewUrl}" class="w-full h-full object-contain bg-grid-small">
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-white truncate">${img.name}</p>
                        <div class="flex gap-3 mt-1">
                            <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">${(img.pngBlob.size / 1024).toFixed(1)} KB (PNG)</span>
                            <span class="text-[10px] text-primary font-bold uppercase tracking-tighter">${(img.webpBlob.size / 1024).toFixed(1)} KB (WebP)</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 w-full md:w-auto">
                    <button onclick="UnifyAspectRatio.downloadOne(${idx}, 'png')" class="shadcn-button border-zinc-800 bg-zinc-900 hover:bg-zinc-800 h-9 px-4 text-[10px] font-bold uppercase gap-2 flex-1 md:flex-none">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                        PNG
                    </button>
                    <button onclick="UnifyAspectRatio.downloadOne(${idx}, 'webp')" class="shadcn-button shadcn-button-primary h-9 px-4 text-[10px] font-bold uppercase gap-2 flex-1 md:flex-none">
                        <i data-lucide="zap" class="w-3.5 h-3.5"></i>
                        WebP
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    downloadOne: (idx, format) => {
        const img = UnifyAspectRatio.processedImages[idx];
        const blob = format === 'webp' ? img.webpBlob : img.pngBlob;
        const ext = format === 'webp' ? 'webp' : 'png';
        const type = format === 'webp' ? 'image/webp' : 'image/png';
        App.downloadFile(blob, `${img.name}.${ext}`, type);
        App.fireConfetti();
    },

    downloadZip: async (asWebp) => {
        const files = UnifyAspectRatio.processedImages.map(img => ({
            name: `${img.name}.${asWebp ? 'webp' : 'png'}`,
            blob: asWebp ? img.webpBlob : img.pngBlob
        }));
        App.downloadZip(files, `unified-aspect-ratio-${asWebp ? 'webp' : 'png'}.zip`);
    }
};

document.addEventListener('DOMContentLoaded', UnifyAspectRatio.init);
