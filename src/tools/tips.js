/**
 * Tips & Facts Module
 */
import '../main.js';
import { App } from '../core/app.js';
import { createIcons, icons } from 'lucide';
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
        return field ?? '';
    },

    render: function() {
        const container = document.getElementById('tips-container');
        if (!container) return;

        const cards = this.data.map(item =>
            App.h('article', { class: 'shadcn-card p-6 sm:p-8 flex flex-col gap-6 hover:border-primary/50 transition-none min-w-0' },
                App.h('div', { class: 'flex justify-between items-start gap-2 flex-wrap' },
                    App.h('span', {
                        class: 'text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20',
                        text: this.t(item.category)
                    }),
                    App.h('i', { attrs: { 'data-lucide': 'lightbulb', 'aria-hidden': 'true' }, class: 'text-amber-400 w-5 h-5 shrink-0' })
                ),
                App.h('div', { class: 'min-w-0' },
                    App.h('h2', { class: 'text-xl font-bold text-white mb-3 tracking-tight break-words', text: this.t(item.title) }),
                    App.h('p', { class: 'text-zinc-400 text-sm leading-relaxed break-words', text: this.t(item.fact) })
                ),
                App.h('div', { class: 'mt-auto pt-6 border-t border-zinc-800 min-w-0' },
                    App.h('p', { class: 'text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2 flex items-center gap-2' },
                        App.h('i', { attrs: { 'data-lucide': 'check-check', 'aria-hidden': 'true' }, class: 'w-3 h-3 text-emerald-500 shrink-0' }),
                        App.t('the_solution') || 'The Solution'
                    ),
                    App.h('p', { class: 'text-sm text-zinc-300 font-medium break-words', text: this.t(item.solution) })
                )
            )
        );

        container.replaceChildren(...cards);
        createIcons({ icons, root: container });
    }
});
