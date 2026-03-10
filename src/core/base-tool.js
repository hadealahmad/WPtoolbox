/**
 * WPToolbox Base Tool Class
 */
import { State } from './state.js';
import { I18n } from './i18n.js';

export class BaseTool {
    constructor(id, config) {
        this.id = id;
        this.config = {
            dropZoneId: 'drop-zone',
            fileInputId: 'file-input',
            progressBarId: 'progress-bar',
            progressStatusId: 'progress-status',
            processedCountId: 'processed-count',
            overlayId: 'processing-overlay',
            cancelBtnId: 'cancel-btn',
            resultsId: 'results-section',
            multiple: false,
            ...config
        };
        this.isCancelled = false;
        this.init();
    }

    init() {
        this.dropZone = document.getElementById(this.config.dropZoneId);
        this.fileInput = document.getElementById(this.config.fileInputId);
        this.overlay = document.getElementById(this.config.overlayId);
        
        if (this.dropZone && this.fileInput) {
            this.dropZone.onclick = (e) => {
                if (e.target.closest('button') || e.target.closest('a')) return;
                this.fileInput.click();
            };
            this.fileInput.onchange = (e) => this.handleFiles(e.target.files);

            this.dropZone.ondragover = (e) => {
                e.preventDefault();
                this.dropZone.classList.add('border-primary', 'bg-primary/5');
            };
            this.dropZone.ondragleave = () => this.dropZone.classList.remove('border-primary', 'bg-primary/5');
            this.dropZone.ondrop = (e) => {
                e.preventDefault();
                this.dropZone.classList.remove('border-primary', 'bg-primary/5');
                this.handleFiles(e.dataTransfer.files);
            };
        }

        // Global language change listener
        window.addEventListener('languageChanged', () => {
            if (this.config.onLanguageChange) this.config.onLanguageChange(State.currentLang);
        });

        // Initialize Lucide icons if any were added dynamically
        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    }

    async handleFiles(files) {
        if (!files || files.length === 0) return;
        this.isCancelled = false;
        
        if (this.config.resultsId) {
            const results = document.getElementById(this.config.resultsId);
            if (results) results.classList.remove('hidden');
        }

        if (this.config.multiple) {
            if (typeof this.config.onFiles === 'function') {
                await this.config.onFiles(files);
            }
        } else {
            if (typeof this.config.onFile === 'function') {
                await this.config.onFile(files[0]);
            }
        }
    }

    showOverlay(title, desc) {
        if (!this.overlay) return;
        const bar = document.getElementById(this.config.progressBarId);
        const status = document.getElementById(this.config.progressStatusId);
        const count = document.getElementById(this.config.processedCountId);
        const titleEl = this.overlay.querySelector('h3');
        const descEl = this.overlay.querySelector('p');

        if (titleEl) titleEl.textContent = title ? (I18n.t(title) || title) : I18n.t('processing_title');
        if (descEl) descEl.textContent = desc ? (I18n.t(desc) || desc) : I18n.t('processing_desc');

        this.overlay.classList.remove('hidden');
        if (bar) bar.style.width = '0%';
        if (status) status.textContent = '0%';
        if (count) count.textContent = '...';
        
        this.isCancelled = false;
    }

    hideOverlay() {
        if (this.overlay) this.overlay.classList.add('hidden');
    }

    updateProgress(percent, current, total) {
        const bar = document.getElementById(this.config.progressBarId);
        const status = document.getElementById(this.config.progressStatusId);
        const count = document.getElementById(this.config.processedCountId);

        if (bar) bar.style.width = `${percent}%`;
        if (status) status.textContent = `${percent}%`;
        if (count) count.textContent = total ? `${current} / ${total}` : `${current}`;
    }

    cancel() {
        this.isCancelled = true;
        this.hideOverlay();
        // Since we don't have direct access to UI or App yet here, I'll rely on global events or pass it in.
        // Or I can import them after they are created. 
        // For now, using a standard alert if UI isn't available, but let's assume it will be available.
        if (window.App && window.App.showToast) {
            window.App.showToast(I18n.t('msg_cancelled'));
        }
    }

    async processInChunks(items, processFn, chunkSize = 100) {
        const total = items.length;
        const results = [];
        for (let i = 0; i < total; i += chunkSize) {
            if (this.isCancelled) return null;
            const chunk = items.slice(i, i + chunkSize);
            const chunkResults = chunk.map((item, idx) => processFn(item, i + idx));
            results.push(...chunkResults);
            const progress = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
            this.updateProgress(progress, i + chunk.length, total);
            // Yield to UI thread
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return results;
    }
}
