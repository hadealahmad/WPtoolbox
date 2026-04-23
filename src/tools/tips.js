/**
 * Tips & Facts Module
 */
import '../main.js';
import { App } from '../core/app.js';
import tipsData from '../data/tips.json';

export const Tips = App.registerTool('Tips', {
    data: [],

    onInit: async function() {
        const container = document.getElementById('tips-container');
        if (!container) return;

        this.data = tipsData;
        this.render();

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.render();
        });
    },

    /**
     * Helper to get translated string from object or return string
     */
    t: function(field) {
        if (typeof field === 'object' && field !== null) {
            return field[App.currentLang] || field['en'] || '';
        }
        return field;
    },

    render: function() {
        const container = document.getElementById('tips-container');
        if (!container) return;

        container.innerHTML = '';

        this.data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'shadcn-card p-8 flex flex-col gap-6 hover:border-primary/50 transition-none';
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">${this.t(item.category)}</span>
                    <i data-lucide="lightbulb" class="text-amber-400 w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-white mb-3 tracking-tight">${this.t(item.title)}</h3>
                    <p class="text-zinc-400 text-sm leading-relaxed">${this.t(item.fact)}</p>
                </div>
                <div class="mt-auto pt-6 border-t border-zinc-800">
                    <p class="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2 flex items-center gap-2">
                        <i data-lucide="check-check" class="w-3 h-3 text-emerald-500"></i>
                        ${App.t('the_solution') || 'The Solution'}
                    </p>
                    <p class="text-sm text-zinc-300 font-medium">${this.t(item.solution)}</p>
                </div>
            `;
            container.appendChild(card);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ icons: lucide.icons });
        }
    }
});
