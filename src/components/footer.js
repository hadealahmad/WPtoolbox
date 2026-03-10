/**
 * WPToolbox Footer Component
 */
import { I18n } from '../core/i18n.js';

export class WptFooter extends HTMLElement {
    constructor() {
        super();
        this.onLanguageChange = this.render.bind(this);
    }

    connectedCallback() {
        window.addEventListener('languageChanged', this.onLanguageChange);
        this.render();
    }

    disconnectedCallback() {
        window.removeEventListener('languageChanged', this.onLanguageChange);
    }

    render() {
        this.className = "bg-zinc-950 border-t border-zinc-900 py-12 mt-20 transition-none block";
        this.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div class="flex items-center gap-2">
                        <i data-lucide="zap" class="w-4 h-4 text-white"></i>
                        <span class="text-sm font-bold tracking-tighter uppercase text-white">WPToolbox</span>
                    </div>
                    <p class="text-zinc-400 text-xs text-center md:text-start">
                        WPToolbox. <span data-i18n="footer_tagline">${I18n.t('footer_tagline')}</span>
                    </p>
                    <div class="flex items-center gap-6">
                        <a href="https://x.com/hadealahmad" target="_blank" class="text-zinc-400 hover:text-white transition-none"><i data-lucide="twitter" class="w-4 h-4"></i></a>
                        <a href="https://github.com/hadealahmad/WPtoolbox" target="_blank" class="text-zinc-400 hover:text-white transition-none"><i data-lucide="github" class="w-4 h-4"></i></a>
                    </div>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    }
}

customElements.define('wpt-footer', WptFooter);
