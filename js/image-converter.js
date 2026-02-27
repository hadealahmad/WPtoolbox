/**
 * Image to WebP Converter Logic
 */
const ImageConverter = {
    files: [],
    quality: 0.8,

    init: () => {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const qualitySlider = document.getElementById('quality-slider');

        if (!dropZone || !fileInput) return;

        // Interaction
        dropZone.onclick = () => fileInput.click();

        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.classList.add('border-primary');
        };

        dropZone.ondragleave = () => {
            dropZone.classList.remove('border-primary');
        };

        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-primary');
            ImageConverter.handleFiles(e.dataTransfer.files);
        };

        fileInput.onchange = (e) => {
            ImageConverter.handleFiles(e.target.files);
        };

        qualitySlider.oninput = (e) => {
            ImageConverter.quality = parseFloat(e.target.value);
            document.getElementById('quality-value').textContent = Math.round(ImageConverter.quality * 100) + '%';
            if (ImageConverter.files.length > 0) {
                ImageConverter.processAll();
            }
        };
    },

    handleFiles: (fileList) => {
        const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) {
            App.showToast('Please upload valid image files');
            return;
        }

        ImageConverter.files = validFiles.map(file => ({
            file,
            originalSize: file.size,
            name: file.name.replace(/\.[^/.]+$/, "") + ".webp"
        }));

        document.getElementById('results-section').classList.remove('hidden');
        ImageConverter.processAll();
    },

    processAll: async () => {
        const container = document.getElementById('images-container');
        container.innerHTML = '';

        for (const item of ImageConverter.files) {
            const result = await ImageConverter.convertToWebP(item);
            ImageConverter.renderItem(result);
        }
    },

    convertToWebP: (item) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    canvas.toBlob((blob) => {
                        resolve({
                            ...item,
                            blob,
                            newSize: blob.size,
                            url: URL.createObjectURL(blob)
                        });
                    }, 'image/webp', ImageConverter.quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(item.file);
        });
    },

    renderItem: (item) => {
        const container = document.getElementById('images-container');
        const savings = Math.round(((item.originalSize - item.newSize) / item.originalSize) * 100);

        const div = document.createElement('div');
        div.className = 'shadcn-card p-4 flex flex-col md:flex-row items-center gap-6';
        div.innerHTML = `
            <div class="w-20 h-20 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                <img src="${item.url}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 min-w-0 text-center md:text-left">
                <p class="text-sm font-bold text-white truncate">${item.name}</p>
                <div class="flex flex-wrap justify-center md:justify-start gap-4 mt-1">
                    <span class="text-[10px] text-zinc-500 uppercase tracking-tighter">Original: <b>${(item.originalSize / 1024).toFixed(1)} KB</b></span>
                    <span class="text-[10px] text-white uppercase tracking-tighter">WebP: <b>${(item.newSize / 1024).toFixed(1)} KB</b></span>
                    <span class="text-[10px] ${savings > 0 ? 'text-emerald-400' : 'text-amber-400'} font-bold uppercase tracking-widest">${savings}% Saved</span>
                </div>
            </div>
            <button onclick="ImageConverter.download('${item.url}', '${item.name}')" 
                class="shadcn-button shadcn-button-outline h-10 px-6 text-xs gap-2 shrink-0">
                <i data-lucide="download" class="w-4 h-4"></i>
                Download
            </button>
        `;
        container.appendChild(div);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    download: (url, name) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
    }
};

document.addEventListener('DOMContentLoaded', ImageConverter.init);
