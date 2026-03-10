/**
 * QR Code Generator Tool
 */
import '../main.js';
import { App } from '../core/app.js';
import QRCode from 'qrcode';

let aspectR;

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
       let str = String(urlStr).replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
       return str || 'qr-code';
    }
}

async function fetchBlobFromDataURL(dataUrl) {
    const response = await fetch(dataUrl);
    return await response.blob();
}

export const QRGenerator = {
    processedQRs: [],

    init: () => {
        aspectR = App.registerTool('QRGenerator', {
            multiple: false,
            resultsId: 'results-section',
            onLanguageChange: () => {
                if (QRGenerator.processedQRs.length > 0) QRGenerator.renderResults();
            }
        });

        const generateBtn = document.getElementById('generate-btn');
        const downloadAllBtn = document.getElementById('download-all-btn');

        if (generateBtn) generateBtn.onclick = QRGenerator.handleGenerate;
        if (downloadAllBtn) downloadAllBtn.onclick = QRGenerator.downloadZip;
    },

    handleGenerate: async () => {
        const linksInput = document.getElementById('links-input');
        const transparentBg = document.getElementById('transparent-bg');
        if (!linksInput) return;

        const text = linksInput.value.trim();
        if (!text) {
            App.showToast(App.t('msg_enter_links') || 'Please enter at least one link.');
            return;
        }

        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return;

        const isTransparent = transparentBg && transparentBg.checked;
        const bgOption = isTransparent ? '#00000000' : '#ffffff';
        // JPG cannot use transparent background, fallback to white
        const jpgBgOption = '#ffffff';

        // UI Setup
        document.getElementById('empty-state')?.classList.add('hidden');
        document.getElementById('results-section')?.classList.remove('hidden');
        
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('processing-bar');
        
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';

        QRGenerator.processedQRs = [];
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
                
                // PNG Data URL
                const pngDataUrl = await QRCode.toDataURL(line, {
                    type: 'image/png',
                    color: { light: bgOption, dark: '#000000' },
                    margin: 1,
                    width: 512
                });
                
                // JPG Data URL
                const jpgDataUrl = await QRCode.toDataURL(line, {
                    type: 'image/jpeg',
                    color: { light: jpgBgOption, dark: '#000000' },
                    margin: 1,
                    width: 512
                });
                
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
                const pngBlob = await fetchBlobFromDataURL(pngDataUrl);
                const jpgBlob = await fetchBlobFromDataURL(jpgDataUrl);

                QRGenerator.processedQRs.push({
                    url: line,
                    name: name,
                    svg: svgBlob,
                    png: pngBlob,
                    jpg: jpgBlob,
                    previewUrl: pngDataUrl
                });

            } catch (error) {
                console.error('Error generating QR for', line, error);
            }
            processed++;
            if (progressBar) progressBar.style.width = `${(processed / lines.length) * 100}%`;
        }

        setTimeout(() => {
            if (progressContainer) progressContainer.classList.add('hidden');
            if (progressBar) progressBar.style.width = '0';
        }, 1000);

        QRGenerator.renderResults();
    },

    renderResults: () => {
        const container = document.getElementById('qrs-container');
        if (!container) return;
        container.innerHTML = '';

        QRGenerator.processedQRs.forEach((qr, idx) => {
            const card = document.createElement('div');
            card.className = 'shadcn-card p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300';
            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center p-2">
                        <img src="${qr.previewUrl}" class="w-full h-full object-contain ${qr.previewUrl.includes('#00000000') || idx > -1 ? 'bg-grid-small' : ''}" alt="${qr.name}">
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-white truncate" title="${qr.name}">${qr.name}</p>
                        <p class="text-[10px] text-zinc-500 truncate mt-1" title="${qr.url}">${qr.url}</p>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <button onclick="QRGenerator.downloadOne(${idx}, 'svg')" class="shadcn-button border-zinc-800 bg-zinc-900 hover:bg-zinc-800 h-8 px-2 text-[10px] font-bold uppercase">
                        SVG
                    </button>
                    <button onclick="QRGenerator.downloadOne(${idx}, 'png')" class="shadcn-button border-zinc-800 bg-zinc-900 hover:bg-zinc-800 h-8 px-2 text-[10px] font-bold uppercase">
                        PNG
                    </button>
                    <button onclick="QRGenerator.downloadOne(${idx}, 'jpg')" class="shadcn-button border-zinc-800 bg-zinc-900 hover:bg-zinc-800 h-8 px-2 text-[10px] font-bold uppercase">
                        JPG
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    },

    downloadOne: (idx, format) => {
        const qr = QRGenerator.processedQRs[idx];
        const blob = qr[format];
        const typeMap = {
            svg: 'image/svg+xml',
            png: 'image/png',
            jpg: 'image/jpeg'
        };
        App.downloadFile(blob, `${qr.name}.${format}`, typeMap[format]);
        App.fireConfetti();
    },

    downloadZip: async () => {
        if (QRGenerator.processedQRs.length === 0) return;
        
        // When downloading all, we could just include PNGs or maybe let them choose.
        // For simplicity, download a zip of PNGs if multiple, or all formats inside folders?
        // Let's download all formats per QR if we want, or just PNGs.
        // Let's create a flat zip with PNGs, or maybe SVG/PNG/JPG for each based on URL.
        const files = [];
        QRGenerator.processedQRs.forEach(qr => {
            files.push({ name: `${qr.name}.png`, blob: qr.png });
            files.push({ name: `${qr.name}.svg`, blob: qr.svg });
        });
        
        App.downloadZip(files, `qr-codes.zip`);
    }
};

// Expose globally for inline event handlers and auto-init
window.QRGenerator = QRGenerator;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', QRGenerator.init);
} else {
    QRGenerator.init();
}
