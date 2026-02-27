/**
 * Tips & Facts Module
 */
const Tips = {
    data: [],

    init: async () => {
        const container = document.getElementById('tips-container');
        if (!container) return;

        try {
            const response = await fetch('js/tips.json');
            if (!response.ok) throw new Error('Failed to load tips');
            Tips.data = await response.json();
            Tips.render();
        } catch (err) {
            console.error('Error loading tips:', err);
            container.innerHTML = `<div class="p-8 text-center text-red-400">Error loading tips. Make sure you are running a local server.</div>`;
        }

        // Listen for language changes from core.js
        window.addEventListener('languageChanged', () => {
            Tips.render();
        });
    },

    /**
     * Helper to get translated string from object or return string
     */
    t: (field) => {
        if (typeof field === 'object' && field !== null) {
            return field[App.currentLang] || field['en'] || '';
        }
        return field;
    },

    render: () => {
        const container = document.getElementById('tips-container');
        if (!container) return;

        container.innerHTML = '';

        Tips.data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'shadcn-card p-8 flex flex-col gap-6 hover:border-primary/50 transition-none';
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">${Tips.t(item.category)}</span>
                    <i data-lucide="lightbulb" class="text-amber-400 w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-white mb-3 tracking-tight">${Tips.t(item.title)}</h3>
                    <p class="text-zinc-400 text-sm leading-relaxed">${Tips.t(item.fact)}</p>
                </div>
                <div class="mt-auto pt-6 border-t border-zinc-800">
                    <p class="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2 flex items-center gap-2">
                        <i data-lucide="check-check" class="w-3 h-3 text-emerald-500"></i>
                        ${App.t('the_solution') || 'The Solution'}
                    </p>
                    <p class="text-sm text-zinc-300 font-medium">${Tips.t(item.solution)}</p>
                </div>
            `;
            container.appendChild(card);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
};

document.addEventListener('DOMContentLoaded', Tips.init);
