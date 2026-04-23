/**
 * QR Code Generator Tool
 */
import '../main.js';
import { App } from '../core/app.js';
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
       let str = String(urlStr).replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
       return str || 'qr-code';
    }
}

export const QRGenerator = App.registerTool('QRGenerator', {
    processedQRs: [],
    multiple: false,
    resultsId: 'results-section',

    onInit: function() {
        const generateBtn = document.getElementById('generate-btn');
        const downloadAllBtn = document.getElementById('download-all-btn');

        if (generateBtn) generateBtn.onclick = () => this.handleGenerate();
        if (downloadAllBtn) downloadAllBtn.onclick = () => this.downloadZip();
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
            App.showToast(App.t('msg_enter_links') || 'Please enter at least one link.');
            return;
        }

        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return;

        const isTransparent = transparentBg && transparentBg.checked;
        const bgOption = isTransparent ? '#00000000' : '#ffffff';

        // UI Setup
        document.getElementById('empty-state')?.classList.add('hidden');
        document.getElementById('results-section')?.classList.remove('hidden');
        
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('processing-bar');
        
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';

        this.processedQRs = [];
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
                
                this.processedQRs.push({
                    content: line,
                    name: name,
                    svg: svgString,
                    png: pngDataUrl
                });

                processed++;
                if (progressBar) progressBar.style.width = `${(processed / lines.length) * 100}%`;
                
                await new Promise(r => setTimeout(r, 0));
            } catch (err) {
                console.error(err);
            }
        }

        this.renderResults();
        
        setTimeout(() => {
            if (progressContainer) progressContainer.classList.add('hidden');
        }, 500);

        App.fireConfetti();
    },

    renderResults: function() {
        const grid = document.getElementById('results-grid');
        if (!grid) return;

        grid.innerHTML = '';
        this.processedQRs.forEach((qr, index) => {
            const card = document.createElement('div');
            card.className = 'shadcn-card p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300';
            card.style.animationDelay = `${index * 50}ms`;
            
            card.innerHTML = `
                <div class="aspect-square rounded-xl bg-white p-4 flex items-center justify-center shadow-inner group relative overflow-hidden">
                    <img src="${qr.png}" class="w-full h-full object-contain">
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                         <button class="btn-dl-png shadcn-button shadcn-button-primary h-8 px-4 text-[10px] gap-2 w-32 justify-center">
                            <i data-lucide="image" class="w-3 h-3"></i>
                            <span>PNG (512px)</span>
                        </button>
                        <button class="btn-dl-svg shadcn-button shadcn-button-outline h-8 px-4 text-[10px] gap-2 w-32 justify-center bg-white/10 text-white border-white/20">
                            <i data-lucide="file-code" class="w-3 h-3"></i>
                            <span>SVG (Vector)</span>
                        </button>
                    </div>
                </div>
                <div class="space-y-1 text-center">
                    <p class="text-[10px] font-bold text-white truncate max-w-full">${qr.name}</p>
                    <p class="text-[8px] text-zinc-600 truncate">${qr.content}</p>
                </div>
            `;

            card.querySelector('.btn-dl-png').onclick = () => App.downloadFile(qr.png, `${qr.name}.png`, 'image/png');
            card.querySelector('.btn-dl-svg').onclick = () => App.downloadFile(qr.svg, `${qr.name}.svg`, 'image/svg+xml');
            grid.appendChild(card);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
        App.translatePage();
    },

    downloadZip: async function() {
        if (!this.processedQRs.length) return;
        
        const zip = new JSZip();
        this.processedQRs.forEach(qr => {
            const pngBase64 = qr.png.split(',')[1];
            zip.file(`${qr.name}.png`, pngBase64, { base64: true });
            zip.file(`${qr.name}.svg`, qr.svg);
        });

        const content = await zip.generateAsync({ type: "blob" });
        App.downloadFile(content, 'qr-codes.zip', 'application/zip');
        App.fireConfetti();
    }
});
