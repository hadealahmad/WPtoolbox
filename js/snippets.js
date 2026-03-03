/**
 * WordPress Snippets Module
 */
const Snippets = {
    data: [], // Library snippets
    userSnippets: [], // Custom user snippets
    favorites: [],
    currentCategory: 'all',

    init: async () => {
        const container = document.getElementById('snippets-container');
        const searchInput = document.getElementById('snippet-search');
        if (!container) return;

        try {
            const response = await fetch('js/data/snippets.json');
            if (!response.ok) throw new Error('Failed to load snippets');
            Snippets.data = await response.json();

            // Load user snippets
            Snippets.userSnippets = JSON.parse(localStorage.getItem('wptoolbox_user_snippets') || '[]');

            // Load favorites
            Snippets.favorites = JSON.parse(localStorage.getItem('wptoolbox_favs') || '[]');

            searchInput.addEventListener('input', (e) => {
                Snippets.render(Snippets.currentCategory, e.target.value);
            });

            // Re-render when language changes
            window.addEventListener('languageChanged', () => {
                Snippets.renderCategories();
                Snippets.render(Snippets.currentCategory, searchInput.value);
            });

            Snippets.renderCategories();
            Snippets.render();
        } catch (err) {
            console.error('Error loading snippets:', err);
            container.innerHTML = `<div class="p-8 text-center text-red-400">Error loading snippets. Make sure you are running a local server.</div>`;
        }
    },

    // --- Modal Management ---
    showAddModal: () => {
        const modal = document.getElementById('snippet-modal');
        if (modal) {
            modal.classList.remove('hidden');
            App.translatePage();
            if (typeof lucide !== 'undefined') lucide.createIcons({ container: modal });
        }
    },

    hideAddModal: () => {
        const modal = document.getElementById('snippet-modal');
        if (modal) modal.classList.add('hidden');
        document.getElementById('add-snippet-form').reset();
    },

    handleAddSnippet: (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newSnippet = {
            id: 'user_' + Date.now(),
            title: { en: formData.get('title'), ar: formData.get('title') },
            category: { en: formData.get('category'), ar: formData.get('category') },
            description: { en: formData.get('description'), ar: formData.get('description') },
            code: formData.get('code'),
            language: formData.get('language'),
            isUser: true
        };

        Snippets.userSnippets.push(newSnippet);
        Snippets.saveToStorage();
        Snippets.hideAddModal();
        Snippets.renderCategories();
        Snippets.render(Snippets.currentCategory, document.getElementById('snippet-search').value);
        App.showToast(App.t('msg_snippet_saved'));
    },

    deleteSnippet: (id) => {
        Snippets.userSnippets = Snippets.userSnippets.filter(s => s.id !== id);
        Snippets.saveToStorage();
        Snippets.renderCategories();
        Snippets.render(Snippets.currentCategory, document.getElementById('snippet-search').value);
        App.showToast(App.t('msg_snippet_deleted'));
    },

    saveToStorage: () => {
        localStorage.setItem('wptoolbox_user_snippets', JSON.stringify(Snippets.userSnippets));
    },

    // --- Import / Export ---
    exportUserSnippets: () => {
        if (Snippets.userSnippets.length === 0) {
            App.showToast("No user snippets to export");
            return;
        }
        const data = JSON.stringify(Snippets.userSnippets, null, 2);
        App.downloadFile(data, 'wptoolbox-snippets.json', 'application/json');
    },

    importUserSnippets: (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    // Basic validation: ensure items have necessary fields
                    const valid = imported.every(s => s.title && s.code && s.id);
                    if (valid) {
                        Snippets.userSnippets = [...Snippets.userSnippets, ...imported];
                        // Deduplicate by ID if needed, but here we just append
                        Snippets.saveToStorage();
                        Snippets.renderCategories();
                        Snippets.render(Snippets.currentCategory, document.getElementById('snippet-search').value);
                        App.showToast(App.t('msg_import_success'));
                    } else {
                        throw new Error('Invalid format');
                    }
                }
            } catch (err) {
                App.showToast(App.t('msg_import_fail'));
            }
            event.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    },

    toggleFavorite: (id) => {
        const idx = Snippets.favorites.indexOf(id);
        if (idx > -1) {
            Snippets.favorites.splice(idx, 1);
        } else {
            Snippets.favorites.push(id);
        }
        localStorage.setItem('wptoolbox_favs', JSON.stringify(Snippets.favorites));

        const searchInput = document.getElementById('snippet-search');
        Snippets.render(Snippets.currentCategory, searchInput ? searchInput.value : '');
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

        const allData = [...Snippets.data, ...Snippets.userSnippets];

        // Get unique English category names for internal filtering
        const uniqueCats = [...new Set(allData.map(s => s.category.en))];

        const btnClass = "px-6 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-none cursor-pointer";
        const activeClass = "bg-zinc-800 text-white shadow-sm";
        const inactiveClass = "text-zinc-500 hover:text-zinc-300";

        catContainer.className = "inline-flex flex-wrap p-1 bg-zinc-900 border border-zinc-800 rounded-xl mb-8";

        let html = `
            <button onclick="Snippets.filter('all', this)" 
                class="cat-btn ${btnClass} ${Snippets.currentCategory === 'all' ? activeClass : inactiveClass}" 
                data-i18n="cat_all">All Snippets</button>
        `;

        uniqueCats.forEach(catEn => {
            // Find the translated name for display
            const item = allData.find(s => s.category.en === catEn);
            const catDisplay = Snippets.t(item.category);
            html += `
                <button onclick="Snippets.filter('${catEn}', this)" 
                    class="cat-btn ${btnClass} ${Snippets.currentCategory === catEn ? activeClass : inactiveClass}">${catDisplay}</button>
            `;
        });

        catContainer.innerHTML = html;
        App.translatePage();
    },

    render: (filter = 'all', searchQuery = '') => {
        const container = document.getElementById('snippets-container');
        if (!container) return;

        container.innerHTML = '';

        const allData = [...Snippets.data, ...Snippets.userSnippets];

        let filtered = filter === 'all'
            ? allData
            : allData.filter(s => s.category.en === filter);

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                Snippets.t(s.title).toLowerCase().includes(q) ||
                Snippets.t(s.description).toLowerCase().includes(q) ||
                s.code.toLowerCase().includes(q)
            );
        }

        // Sort: Favorites first, then User items
        const sorted = [...filtered].sort((a, b) => {
            const aFav = Snippets.favorites.includes(a.id);
            const bFav = Snippets.favorites.includes(b.id);
            if (aFav !== bFav) return aFav ? -1 : 1;

            if (a.isUser !== b.isUser) return a.isUser ? -1 : 1;
            return 0;
        });

        sorted.forEach((item, index) => {
            const isFav = Snippets.favorites.includes(item.id);
            const card = document.createElement('div');
            card.className = 'snippet-card shadcn-card p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300';

            // Generate a safe ID for the code block to reference
            const codeId = `code-block-${index}`;

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">${Snippets.t(item.category)}</span>
                            ${isFav ? '<i data-lucide="star" class="w-4 h-4 text-amber-400 fill-amber-400"></i>' : ''}
                            ${item.isUser ? `<span class="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[8px] font-bold rounded" data-i18n="user_category">${App.t('user_category')}</span>` : ''}
                        </div>
                        <h3 class="text-lg font-bold text-white mt-1">${Snippets.t(item.title)}</h3>
                    </div>
                    <div class="flex gap-2">
                        ${item.isUser ? `
                            <button onclick="Snippets.deleteSnippet('${item.id}')" class="shadcn-button shadcn-button-outline w-12 h-12 p-0 flex items-center justify-center border-red-900/50 hover:bg-red-900/20 text-red-500 transition-none" title="Delete">
                                <i data-lucide="trash-2" class="w-5 h-5"></i>
                            </button>
                        ` : ''}
                        <button onclick="Snippets.toggleFavorite('${item.id}')" class="shadcn-button shadcn-button-outline w-12 h-12 p-0 flex items-center justify-center transition-none" title="Favorite">
                            <i data-lucide="star" class="w-5 h-5 ${isFav ? 'text-amber-400 fill-amber-400' : 'text-zinc-500'}"></i>
                        </button>
                        <button onclick="Snippets.copyCode('${codeId}', this)" class="shadcn-button shadcn-button-outline h-12 px-4 text-[10px] gap-2 transition-none">
                            <i data-lucide="copy" class="w-3 h-3"></i>
                            <span data-i18n="copy_btn">${App.t('copy_btn')}</span>
                        </button>
                    </div>
                </div>
                <p class="text-zinc-400 text-sm leading-relaxed">${Snippets.t(item.description)}</p>
                <div class="mt-2 rounded-lg bg-zinc-950 border border-zinc-900 overflow-hidden">
                    <div class="px-4 py-2 bg-zinc-900/50 border-b border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                        <span>${item.language}</span>
                    </div>
                    <pre class="p-4 overflow-x-auto text-xs font-mono text-zinc-300 leading-relaxed"><code id="${codeId}">${Snippets.escapeHtml(item.code)}</code></pre>
                </div>
            `;
            container.appendChild(card);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    copyCode: (elementId, btn) => {
        const codeElement = document.getElementById(elementId);
        if (codeElement) {
            App.copyToClipboard(codeElement.textContent, btn);
        }
    },

    escapeHtml: (unsafe) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    filter: (categoryEn, btn) => {
        Snippets.currentCategory = categoryEn;

        document.querySelectorAll('.cat-btn').forEach(b => {
            b.classList.remove('bg-zinc-800', 'text-white', 'shadow-sm');
            b.classList.add('text-zinc-500', 'hover:text-zinc-300');
        });

        if (btn) {
            btn.classList.add('bg-zinc-800', 'text-white', 'shadow-sm');
            btn.classList.remove('text-zinc-500', 'hover:text-zinc-300');
        }

        Snippets.render(categoryEn, document.getElementById('snippet-search').value);
    }
};

document.addEventListener('DOMContentLoaded', Snippets.init);
