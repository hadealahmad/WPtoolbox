/**
 * WordPress Snippets Module
 */
const Snippets = {
    data: [],

    init: async () => {
        const container = document.getElementById('snippets-container');
        if (!container) return;

        try {
            const response = await fetch('js/snippets.json');
            if (!response.ok) throw new Error('Failed to load snippets');
            Snippets.data = await response.json();
            Snippets.render(Snippets.data);
        } catch (err) {
            console.error('Error loading snippets:', err);
            container.innerHTML = `<div class="p-8 text-center text-red-400">Error loading snippets. Make sure you are running a local server.</div>`;
        }

        // Category Filter Logic
        const filters = document.querySelectorAll('.category-filter');
        filters.forEach(btn => {
            btn.onclick = () => {
                const category = btn.dataset.category;

                // Update UI state
                filters.forEach(b => {
                    b.classList.remove('bg-white', 'text-zinc-950');
                    b.classList.add('text-zinc-400');
                });
                btn.classList.add('bg-white', 'text-zinc-950');
                btn.classList.remove('text-zinc-400');

                const filtered = category === 'all'
                    ? Snippets.data
                    : Snippets.data.filter(s => s.category === category);

                Snippets.render(filtered);
            };
        });
    },

    render: (items) => {
        const container = document.getElementById('snippets-container');
        container.innerHTML = '';

        const escapeHTML = (str) => {
            return str.replace(/[&<>"']/g, function (m) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                }[m];
            });
        };

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'shadcn-card p-6 flex flex-col gap-4 hover:shadow-md';
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800">${item.category}</span>
                        <h3 class="text-lg font-bold mt-2 text-white">${item.title}</h3>
                        <p class="text-xs text-zinc-500 mt-1">${item.description}</p>
                    </div>
                    <button class="copy-btn shadcn-button shadcn-button-outline h-8 px-3 text-xs gap-2">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                        Copy
                    </button>
                </div>
                <div class="relative group mt-2">
                    <pre class="bg-zinc-950 text-zinc-300 p-4 rounded-lg text-xs font-mono overflow-auto scrollbar-hide max-h-60 leading-relaxed border border-zinc-800"><code>${escapeHTML(item.code)}</code></pre>
                </div>
            `;

            const copyBtn = card.querySelector('.copy-btn');
            copyBtn.onclick = () => App.copyToClipboard(item.code, copyBtn);

            container.appendChild(card);
        });

        // Initialize icons for newly added elements
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
};

document.addEventListener('DOMContentLoaded', Snippets.init);
