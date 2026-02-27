/**
 * WordPress Snippets Module
 */
const Snippets = {
    data: [],
    categories: [],

    init: async () => {
        const container = document.getElementById('snippets-container');
        if (!container) return;

        try {
            const response = await fetch('js/snippets.json');
            if (!response.ok) throw new Error('Failed to load snippets');
            Snippets.data = await response.json();

            // Re-render when language changes
            window.addEventListener('languageChanged', () => {
                Snippets.renderCategories();
                Snippets.render();
            });

            Snippets.renderCategories();
            Snippets.render();
        } catch (err) {
            console.error('Error loading snippets:', err);
            container.innerHTML = `<div class="p-8 text-center text-red-400">Error loading snippets. Make sure you are running a local server.</div>`;
        }
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

    renderCategories: () => {
        const catContainer = document.getElementById('categories');
        if (!catContainer) return;

        const cats = [...new Set(Snippets.data.map(s => Snippets.t(s.category)))];
        catContainer.innerHTML = `
            <button onclick="Snippets.filter('all')" class="cat-btn active" data-i18n="cat_all">All Snippets</button>
            ${cats.map(cat => `
                <button onclick="Snippets.filter('${cat}')" class="cat-btn">${cat}</button>
            `).join('')}
        `;
        App.translatePage(); // Ensure "All Snippets" is translated
    },

    render: (filter = 'all') => {
        const container = document.getElementById('snippets-container');
        if (!container) return;

        container.innerHTML = '';
        const filtered = filter === 'all'
            ? Snippets.data
            : Snippets.data.filter(s => Snippets.t(s.category) === filter);

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'snippet-card shadcn-card p-6 flex flex-col gap-4';
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">${Snippets.t(item.category)}</span>
                        <h3 class="text-lg font-bold text-white mt-1">${Snippets.t(item.title)}</h3>
                    </div>
                    <button onclick="App.copyToClipboard(\`${item.code}\`, this)" class="shadcn-button shadcn-button-outline h-8 px-4 text-[10px] gap-2">
                        <i data-lucide="copy" class="w-3 h-3"></i>
                        ${App.t('copy_btn')}
                    </button>
                </div>
                <p class="text-zinc-400 text-sm">${Snippets.t(item.description)}</p>
                <div class="mt-2 rounded-lg bg-zinc-950 border border-zinc-900 overflow-hidden">
                    <div class="px-4 py-2 bg-zinc-900/50 border-b border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                        <span>${item.language}.php</span>
                    </div>
                    <pre class="p-4 overflow-x-auto text-xs font-mono text-zinc-300"><code>${item.code}</code></pre>
                </div>
            `;
            container.appendChild(card);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    filter: (category) => {
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === category || (category === 'all' && btn.dataset.i18n === 'cat_all'));
        });
        Snippets.render(category);
    }
};

document.addEventListener('DOMContentLoaded', Snippets.init);
