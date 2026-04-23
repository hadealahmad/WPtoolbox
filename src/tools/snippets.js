/**
 * WordPress Snippets Module
 */
import '../main.js';
import { App } from '../core/app.js';
import snippetsData from '../data/snippets.json';

export const Snippets = App.registerTool('Snippets', {
    data: [], // Library snippets
    userSnippets: [], // Custom user snippets
    favorites: [],
    currentCategory: 'all',

    onInit: async function() {
        const container = document.getElementById('snippets-container');
        const searchInput = document.getElementById('snippet-search');
        if (!container) return;

        this.data = snippetsData;

        // Load user snippets
        this.userSnippets = JSON.parse(localStorage.getItem('wptoolbox_user_snippets') || '[]');

        // Load favorites
        this.favorites = JSON.parse(localStorage.getItem('wptoolbox_favs') || '[]');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.render(this.currentCategory, e.target.value);
            });
        }

        // Re-render when language changes
        window.addEventListener('languageChanged', () => {
            this.renderCategories();
            this.render(this.currentCategory, searchInput ? searchInput.value : '');
        });

        // Bind buttons
        const addBtn = document.getElementById('add-snippet-btn');
        const exportBtn = document.getElementById('export-snippets-btn');
        const importTrigger = document.getElementById('import-snippets-trigger');
        const importInput = document.getElementById('import-input');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const cancelModalBtn = document.getElementById('cancel-modal-btn');
        const addForm = document.getElementById('add-snippet-form');

        if (addBtn) addBtn.onclick = () => this.showAddModal();
        if (exportBtn) exportBtn.onclick = () => this.exportUserSnippets();
        if (importTrigger && importInput) importTrigger.onclick = () => importInput.click();
        if (importInput) importInput.onchange = (e) => this.importUserSnippets(e);
        if (closeModalBtn) closeModalBtn.onclick = () => this.hideAddModal();
        if (cancelModalBtn) cancelModalBtn.onclick = () => this.hideAddModal();
        if (addForm) addForm.onsubmit = (e) => this.handleAddSnippet(e);

        this.renderCategories();
        this.render();
    },

    // --- Modal Management ---
    showAddModal: function() {
        const modal = document.getElementById('snippet-modal');
        if (modal) {
            modal.classList.remove('hidden');
            App.translatePage();
            if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons, container: modal });
        }
    },

    hideAddModal: function() {
        const modal = document.getElementById('snippet-modal');
        if (modal) modal.classList.add('hidden');
        const form = document.getElementById('add-snippet-form');
        if (form) form.reset();
    },

    handleAddSnippet: function(e) {
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

        this.userSnippets.push(newSnippet);
        this.saveToStorage();
        this.hideAddModal();
        this.renderCategories();
        const searchInput = document.getElementById('snippet-search');
        this.render(this.currentCategory, searchInput ? searchInput.value : '');
        App.showToast(App.t('msg_snippet_added') || 'Snippet added!');
        App.fireConfetti();
    },

    saveToStorage: function() {
        localStorage.setItem('wptoolbox_user_snippets', JSON.stringify(this.userSnippets));
        localStorage.setItem('wptoolbox_favs', JSON.stringify(this.favorites));
    },

    renderCategories: function() {
        const catContainer = document.getElementById('categories-list');
        if (!catContainer) return;

        const allSnippets = [...this.data, ...this.userSnippets];
        const categories = {};
        
        allSnippets.forEach(s => {
            const cat = s.category[App.currentLang] || s.category['en'];
            categories[cat] = (categories[cat] || 0) + 1;
        });

        let html = `
            <button class="cat-btn w-full text-start px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all flex justify-between items-center group ${this.currentCategory === 'all' ? 'active bg-zinc-800 border-primary/50 text-white' : 'text-zinc-400'}" data-category="all">
                <span class="text-xs font-medium" data-i18n="cat_all">All Snippets</span>
                <span class="text-[10px] font-bold bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">${allSnippets.length}</span>
            </button>
            <button class="cat-btn w-full text-start px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all flex justify-between items-center group ${this.currentCategory === 'favs' ? 'active bg-zinc-800 border-primary/50 text-white' : 'text-zinc-400'}" data-category="favs">
                <span class="text-xs font-medium" data-i18n="cat_favs">Favorites</span>
                <span class="text-[10px] font-bold bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">${this.favorites.length}</span>
            </button>
            <div class="my-4 border-t border-zinc-900"></div>
        `;

        Object.entries(categories).sort().forEach(([name, count]) => {
            html += `
                <button class="cat-btn w-full text-start px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all flex justify-between items-center group ${this.currentCategory === name ? 'active bg-zinc-800 border-primary/50 text-white' : 'text-zinc-400'}" data-category="${name}">
                    <span class="text-xs font-medium truncate">${name}</span>
                    <span class="text-[10px] font-bold bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">${count}</span>
                </button>
            `;
        });

        catContainer.innerHTML = html;
        
        catContainer.querySelectorAll('.cat-btn').forEach(btn => {
            btn.onclick = () => {
                this.currentCategory = btn.dataset.category;
                const searchInput = document.getElementById('snippet-search');
                this.render(this.currentCategory, searchInput ? searchInput.value : '');
                this.renderCategories();
            };
        });

        App.translatePage();
    },

    render: function(category = 'all', searchQuery = '') {
        const container = document.getElementById('snippets-container');
        if (!container) return;

        let filtered = [...this.data, ...this.userSnippets];

        if (category === 'favs') {
            filtered = filtered.filter(s => this.favorites.includes(s.id));
        } else if (category !== 'all') {
            filtered = filtered.filter(s => (s.category[App.currentLang] || s.category['en']) === category);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s => 
                (s.title[App.currentLang] || s.title['en']).toLowerCase().includes(query) ||
                (s.description[App.currentLang] || s.description['en']).toLowerCase().includes(query) ||
                s.code.toLowerCase().includes(query)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="py-20 text-center text-zinc-600 border-2 border-dashed border-zinc-900 rounded-3xl">
                    <i data-lucide="search-x" class="w-12 h-12 mx-auto mb-4 opacity-20"></i>
                    <p data-i18n="msg_no_snippets">No snippets found matching your criteria</p>
                </div>
            `;
        } else {
            container.innerHTML = '';
            filtered.forEach(s => {
                const card = this.createSnippetCard(s);
                container.appendChild(card);
            });
        }

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
        App.translatePage();
    },

    createSnippetCard: function(s) {
        const card = document.createElement('div');
        const isFav = this.favorites.includes(s.id);
        const title = s.title[App.currentLang] || s.title['en'];
        const desc = s.description[App.currentLang] || s.description['en'];
        const cat = s.category[App.currentLang] || s.category['en'];

        card.className = 'snippet-card group shadcn-card p-6 bg-zinc-900/20 hover:bg-zinc-900/40 border-zinc-900 transition-all';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <h3 class="text-sm font-bold text-white group-hover:text-primary transition-colors">${title}</h3>
                        ${s.isUser ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase tracking-widest border border-amber-500/20">Custom</span>' : ''}
                    </div>
                    <p class="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                        <i data-lucide="tag" class="w-3 h-3"></i>
                        ${cat}
                    </p>
                </div>
                <div class="flex gap-1.5">
                    <button class="btn-fav w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isFav ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-zinc-950 border border-zinc-800 text-zinc-600 hover:text-rose-500'}">
                        <i data-lucide="heart" class="w-3.5 h-3.5" ${isFav ? 'fill="currentColor"' : ''}></i>
                    </button>
                    ${s.isUser ? `
                        <button class="btn-delete w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-600 hover:text-red-500 flex items-center justify-center transition-all">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <p class="text-xs text-zinc-500 leading-relaxed mb-6 line-clamp-2">${desc}</p>
            
            <div class="relative group/code">
                <div class="absolute top-3 end-3 flex gap-2 opacity-0 group-hover/code:opacity-100 transition-all translate-y-1 group-hover/code:translate-y-0">
                    <button class="btn-copy h-8 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-primary hover:border-primary transition-all">
                        <i data-lucide="copy" class="w-3 h-3"></i>
                        <span data-i18n="copy_btn">Copy</span>
                    </button>
                </div>
                <pre class="p-4 rounded-xl bg-zinc-950 border border-zinc-900 text-[11px] font-mono text-zinc-400 overflow-x-auto max-h-[120px] scrollbar-thin"><code>${s.code}</code></pre>
            </div>
        `;

        card.querySelector('.btn-copy').onclick = (e) => App.copyToClipboard(s.code, e.currentTarget);
        card.querySelector('.btn-fav').onclick = () => this.toggleFavorite(s.id);
        if (s.isUser) {
            card.querySelector('.btn-delete').onclick = () => this.deleteUserSnippet(s.id);
        }

        return card;
    },

    toggleFavorite: function(id) {
        if (this.favorites.includes(id)) {
            this.favorites = this.favorites.filter(fid => fid !== id);
        } else {
            this.favorites.push(id);
        }
        this.saveToStorage();
        this.renderCategories();
        const searchInput = document.getElementById('snippet-search');
        this.render(this.currentCategory, searchInput ? searchInput.value : '');
    },

    deleteUserSnippet: function(id) {
        if (!confirm(App.t('msg_confirm_delete_snippet') || 'Delete this snippet?')) return;
        this.userSnippets = this.userSnippets.filter(s => s.id !== id);
        this.favorites = this.favorites.filter(fid => fid !== id);
        this.saveToStorage();
        this.renderCategories();
        const searchInput = document.getElementById('snippet-search');
        this.render(this.currentCategory, searchInput ? searchInput.value : '');
        App.showToast(App.t('msg_snippet_deleted') || 'Snippet deleted.');
    },

    exportUserSnippets: function() {
        if (this.userSnippets.length === 0) {
            App.showToast(App.t('msg_nothing_to_export') || 'No custom snippets to export.');
            return;
        }
        const data = JSON.stringify(this.userSnippets, null, 2);
        App.downloadFile(data, 'my-snippets.json', 'application/json');
    },

    importUserSnippets: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    const existingIds = this.userSnippets.map(s => s.id);
                    const newSnippets = imported.filter(s => !existingIds.includes(s.id));
                    this.userSnippets = [...this.userSnippets, ...newSnippets];
                    this.saveToStorage();
                    this.renderCategories();
                    this.render();
                    App.showToast(App.t('msg_import_success') || 'Snippets imported!');
                }
            } catch (err) {
                App.showToast(App.t('msg_import_fail') || 'Invalid file format.');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    }
});
