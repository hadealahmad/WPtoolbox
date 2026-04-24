import '../main.js';
import { App } from '../core/app.js';
import JSZip from 'jszip';
import { UI } from '../core/ui.js';

export const SVGSanitizer = App.registerTool('SVGSanitizer', {
    results: [],
    zip: null,
    multiple: true,

    onInit: function() {
        this.zip = new JSZip();
        this.bindEvents();
    },

    bindEvents: function() {
        const downloadZipBtn = document.getElementById('download-zip-btn');

        // Global Paste
        document.addEventListener('paste', (e) => {
            const files = Array.from(e.clipboardData.files).filter(f => f.type === 'image/svg+xml');
            if (files.length > 0) {
                this.onFiles(files);
            }
        });

        if (downloadZipBtn) {
            downloadZipBtn.addEventListener('click', () => this.downloadZip());
        }
    },

    onFiles: async function(files) {
        const svgFiles = Array.from(files).filter(f => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'));

        if (svgFiles.length === 0) {
            UI.showToast(App.t('msg_upload_images') || "Please upload valid SVG files.");
            return;
        }

        this.updateProgress(0);
        document.getElementById('results-section').classList.remove('hidden');
        const resultsGrid = document.getElementById('results-grid');
        resultsGrid.innerHTML = '';
        this.results = [];
        this.zip = new JSZip();

        let processed = 0;
        const total = svgFiles.length;

        for (const file of svgFiles) {
            try {
                const text = await file.text();
                const sanitized = this.sanitizeSVG(text);
                const blob = new Blob([sanitized], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                
                const origSize = file.size;
                const newSize = blob.size;
                const saved = origSize - newSize;
                const savedPercent = origSize > 0 ? ((saved / origSize) * 100).toFixed(1) : 0;

                const originalName = file.name.replace(/\.svg$/i, '');
                const newName = `${originalName}-sanitized.svg`;

                this.results.push({ name: newName, url, blob });
                this.zip.file(newName, blob);

                this.renderResultCard(resultsGrid, newName, url, origSize, newSize, savedPercent);
            } catch (err) {
                console.error('Error processing file:', file.name, err);
            }

            processed++;
            this.updateProgress((processed / total) * 100);
        }

        setTimeout(() => this.updateProgress(0), 1000);
        UI.showToast(App.t('msg_all_done') || "All files processed!");
    },

    sanitizeSVG: function(svgText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        
        // Remove script tags
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => script.remove());

        // Remove dangerous attributes (on*)
        const elements = doc.querySelectorAll('*');
        elements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.toLowerCase().startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
                if (attr.value.toLowerCase().includes('javascript:')) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        const serializer = new XMLSerializer();
        let cleanSvg = serializer.serializeToString(doc);
        
        // Basic optimization: strip out comments
        cleanSvg = cleanSvg.replace(/<!--[\s\S]*?-->/g, '');
        // Strip XML declaration if present
        cleanSvg = cleanSvg.replace(/<\?xml.*?\?>/g, '');
        // Strip doctype
        cleanSvg = cleanSvg.replace(/<!DOCTYPE.*?>/g, '');
        
        return cleanSvg.trim();
    },

    renderResultCard: function(container, name, url, oldSize, newSize, savedPercent) {
        const card = document.createElement('div');
        card.className = "shadcn-card p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative group overflow-hidden bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800";

        card.innerHTML = `
            <div class="h-32 w-full bg-zinc-950/50 rounded-lg flex items-center justify-center p-4 relative checkerboard-bg">
                <img src="${url}" class="max-h-full max-w-full object-contain" alt="${name}">
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button class="dl-btn shadcn-button shadcn-button-primary h-8 px-4 text-xs" data-url="${url}" data-name="${name}">
                        <i data-lucide="download" class="w-4 h-4"></i> Download
                    </button>
                </div>
            </div>
            <div>
                <p class="text-sm font-medium text-white truncate" title="${name}">${name}</p>
                <div class="flex items-center justify-between mt-2">
                    <span class="text-xs text-zinc-500 line-through">${App.formatSize ? App.formatSize(oldSize) : oldSize + ' B'}</span>
                    <i data-lucide="arrow-right" class="w-3 h-3 text-zinc-600"></i>
                    <span class="text-xs font-bold text-emerald-400">${App.formatSize ? App.formatSize(newSize) : newSize + ' B'}</span>
                </div>
                ${savedPercent > 0 ? `<p class="text-[10px] text-emerald-500/80 mt-1 text-end">Saved ${savedPercent}%</p>` : ''}
            </div>
        `;

        container.appendChild(card);
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ icons: lucide.icons, root: card });
        }

        card.querySelector('.dl-btn').addEventListener('click', (e) => {
            const a = document.createElement('a');
            a.href = e.currentTarget.dataset.url;
            a.download = e.currentTarget.dataset.name;
            a.click();
        });
    },

    updateProgress: function(percent) {
        const bar = document.getElementById('processing-bar');
        if (bar) bar.style.width = `${percent}%`;
    },

    downloadZip: async function() {
        if (!this.results.length) return;

        const btn = document.getElementById('download-zip-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Zipping...`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons, root: btn });
        btn.disabled = true;

        try {
            const content = await this.zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sanitized_svgs_${Date.now()}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            UI.showToast("ZIP downloaded successfully!");
            App.fireConfetti();
        } catch (error) {
            console.error("Error creating ZIP:", error);
            UI.showToast("Failed to create ZIP.", "error");
        } finally {
            btn.innerHTML = originalText;
            if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons, root: btn });
            btn.disabled = false;
        }
    }
});
