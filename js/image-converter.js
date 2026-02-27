const ImageConverter = {
    quality: 0.8,
    convertedImages: [],

    init: () => {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const qualitySlider = document.getElementById('quality-slider');
        const qualityValue = document.getElementById('quality-value');
        const zipBtn = document.getElementById('download-zip-btn');

        if (!dropZone || !fileInput) return;

        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => ImageConverter.handleFiles(e.target.files);

        qualitySlider.oninput = (e) => {
            ImageConverter.quality = parseFloat(e.target.value);
            qualityValue.textContent = `${Math.round(ImageConverter.quality * 100)}%`;
        };

        if (zipBtn) zipBtn.onclick = () => ImageConverter.downloadZip();

        // Drag and drop listeners
        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.classList.add('border-primary');
        };
        dropZone.ondragleave = () => dropZone.classList.remove('border-primary');
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-primary');
            ImageConverter.handleFiles(e.dataTransfer.files);
        };

        window.addEventListener('languageChanged', () => {
            if (ImageConverter.convertedImages.length > 0) {
                ImageConverter.renderResults();
            }
        });
    },

    handleFiles: async (files) => {
        if (!files.length) return;

        // Show results section
        document.getElementById('results-section').classList.remove('hidden');
        const progressBar = document.getElementById('processing-bar');
        ImageConverter.convertedImages = [];

        let processed = 0;
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                App.showToast(App.t('msg_upload_images'));
                continue;
            }
            await ImageConverter.processImage(file);
            processed++;
            if (progressBar) progressBar.style.width = `${(processed / files.length) * 100}%`;
        }

        setTimeout(() => {
            if (progressBar) progressBar.style.width = '0';
        }, 1000);
    },

    processImage: (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Smart Resizing
                    const resizeToggle = document.getElementById('resize-toggle');
                    const shouldResize = resizeToggle ? resizeToggle.checked : false;
                    if (shouldResize && width > 1920) {
                        height = (1920 / width) * height;
                        width = 1920;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        ImageConverter.convertedImages.push({
                            name: file.name.split('.')[0] + '.webp',
                            blob: blob,
                            originalSize: file.size,
                            webpSize: blob.size
                        });
                        ImageConverter.renderResults();
                        resolve();
                    }, 'image/webp', ImageConverter.quality);
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

        ImageConverter.convertedImages.forEach((img, idx) => {
            const savedPercent = Math.round((1 - img.webpSize / img.originalSize) * 100);
            const card = document.createElement('div');
            card.className = 'shadcn-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300';
            card.innerHTML = `
                <div class="flex items-center gap-4 w-full">
                    <div class="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <i data-lucide="image" class="w-6 h-6 text-zinc-600"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-white truncate">${img.name}</p>
                        <div class="flex gap-3 mt-1">
                            <span class="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">${App.t('label_original')}: ${(img.originalSize / 1024).toFixed(1)} KB</span>
                            <span class="text-[10px] text-primary font-bold uppercase tracking-tighter">${App.t('label_webp')}: ${(img.webpSize / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                    <div class="hidden sm:flex flex-col items-end">
                        <span class="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">${App.t('label_saved')} ${savedPercent}%</span>
                    </div>
                </div>
                <button onclick="ImageConverter.downloadOne(${idx})" class="shadcn-button shadcn-button-outline h-10 w-full md:w-auto px-6 text-xs gap-2 shrink-0">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    ${App.t('download_btn')}
                </button>
            `;
            container.appendChild(card);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    downloadOne: (idx) => {
        const img = ImageConverter.convertedImages[idx];
        App.downloadFile(img.blob, img.name, 'image/webp');
        App.fireConfetti();
    },

    downloadZip: async () => {
        if (typeof JSZip === 'undefined') {
            App.showToast("JSZip not loaded");
            return;
        }
        const zip = new JSZip();
        ImageConverter.convertedImages.forEach(img => {
            zip.file(img.name, img.blob);
        });
        const content = await zip.generateAsync({ type: 'blob' });
        App.downloadFile(content, 'wptoolbox-images.zip', 'application/zip');
        App.fireConfetti();
    }
};

document.addEventListener('DOMContentLoaded', ImageConverter.init);
