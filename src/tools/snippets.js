/**
 * WordPress Snippets Module
 */
import '../main.js';
import { App } from '../core/app.js';
import { renderIcons } from '../core/icons.js';
import snippetsData from '../data/snippets.json';

const SUPPORTS_CLOSEDBY = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

function attachBackdropDismiss(dialog, card, onDismiss) {
    if (!dialog || !card || SUPPORTS_CLOSEDBY) return;
    let startedOutside = false;
    const isOutside = (e) => {
        const r = card.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    dialog.addEventListener('pointerdown', (e) => {
        startedOutside = e.target === dialog && isOutside(e);
    });
    dialog.addEventListener('pointerup', (e) => {
        if (startedOutside && e.target === dialog && isOutside(e)) onDismiss();
        startedOutside = false;
    });
}

function localized(val, fallback = '') {
    if (val && typeof val === 'object') {
        return String(val[App.currentLang] || val.en || val.ar || fallback);
    }
    return String(val || fallback);
}

function sanitizeUserSnippets(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(s => s && typeof s === 'object')
        .map((s, idx) => ({
            id: String(s.id || `user_${Date.now()}_${idx}`),
            title: s.title && typeof s.title === 'object'
                ? { en: String(s.title.en || ''), ar: String(s.title.ar || s.title.en || '') }
                : { en: String(s.title || ''), ar: String(s.title || '') },
            category: s.category && typeof s.category === 'object'
                ? { en: String(s.category.en || 'Custom'), ar: String(s.category.ar || s.category.en || 'مخصص') }
                : { en: String(s.category || 'Custom'), ar: String(s.category || 'Custom') },
            description: s.description && typeof s.description === 'object'
                ? { en: String(s.description.en || ''), ar: String(s.description.ar || s.description.en || '') }
                : { en: String(s.description || ''), ar: String(s.description || '') },
            code: String(s.code || ''),
            language: String(s.language || 'PHP'),
            isUser: true
        }));
}

export const Snippets = App.registerTool('Snippets', {
    data: [], // Library snippets
    userSnippets: [], // Custom user snippets
    favorites: [],
    currentCategory: 'all',
    editingId: null,

    onInit: async function() {
        const container = document.getElementById('snippets-container');
        const searchInput = document.getElementById('snippet-search');
        if (!container) return;

        this.data = snippetsData;

        // Load user snippets safely
        try {
            this.userSnippets = sanitizeUserSnippets(JSON.parse(localStorage.getItem('wptoolbox_user_snippets') || '[]'));
        } catch {
            this.userSnippets = [];
        }

        // Load favorites safely
        try {
            const favs = JSON.parse(localStorage.getItem('wptoolbox_favs') || '[]');
            this.favorites = Array.isArray(favs) ? favs.map(String) : [];
        } catch {
            this.favorites = [];
        }

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

        // Bind modal close & backdrop
        const modal = document.getElementById('snippet-modal');
        const modalCard = document.getElementById('snippet-modal-card');
        if (modal) {
            attachBackdropDismiss(modal, modalCard, () => this.hideAddModal());
            modal.addEventListener('close', () => {
                this.editingId = null;
                document.getElementById('add-snippet-form')?.reset();
            });
        }

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
        const form = document.getElementById('add-snippet-form');
        const titleEl = document.getElementById('snippet-modal-title');
        this.editingId = null;
        if (form) form.reset();
        if (titleEl) {
            titleEl.dataset.i18n = 'modal_add_title';
            titleEl.textContent = App.t('modal_add_title') || 'Add New Snippet';
        }
        if (modal && typeof modal.showModal === 'function' && !modal.open) {
            modal.showModal();
            App.translatePage();
            renderIcons(modal);
            document.getElementById('snippet-title-input')?.focus();
        }
    },

    showEditModal: function(id) {
        const snippet = this.userSnippets.find(s => s.id === id);
        const modal = document.getElementById('snippet-modal');
        const titleEl = document.getElementById('snippet-modal-title');
        if (!snippet || !modal) return;

        this.editingId = id;
        if (titleEl) {
            titleEl.dataset.i18n = 'modal_edit_snippet';
            titleEl.textContent = App.t('modal_edit_snippet') || 'Edit Snippet';
        }
        document.getElementById('snippet-title-input').value = localized(snippet.title);
        document.getElementById('snippet-category-input').value = localized(snippet.category);
        document.getElementById('snippet-description-input').value = localized(snippet.description);
        document.getElementById('snippet-code-input').value = String(snippet.code || '');
        document.getElementById('snippet-language-input').value = String(snippet.language || '');

        if (typeof modal.showModal === 'function' && !modal.open) {
            modal.showModal();
            App.translatePage();
            renderIcons(modal);
            document.getElementById('snippet-title-input')?.focus();
        }
    },

    hideAddModal: function() {
        const modal = document.getElementById('snippet-modal');
        if (modal && modal.open) modal.close();
        this.editingId = null;
        document.getElementById('add-snippet-form')?.reset();
    },

    handleAddSnippet: function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const titleVal = String(formData.get('title') || '').trim();
        const catVal = String(formData.get('category') || '').trim();
        const descVal = String(formData.get('description') || '').trim();
        const codeVal = String(formData.get('code') || '');
        const langVal = String(formData.get('language') || '').trim();

        if (!titleVal || !catVal || !descVal || !codeVal.trim() || !langVal) return;

        if (this.editingId) {
            const target = this.userSnippets.find(s => s.id === this.editingId);
            if (target) {
                target.title = { en: titleVal, ar: titleVal };
                target.category = { en: catVal, ar: catVal };
                target.description = { en: descVal, ar: descVal };
                target.code = codeVal;
                target.language = langVal;
            }
            this.saveToStorage();
            this.hideAddModal();
            this.renderCategories();
            const searchInput = document.getElementById('snippet-search');
            this.render(this.currentCategory, searchInput ? searchInput.value : '');
            App.showToast(App.t('msg_snippet_updated') || 'Snippet updated!', 'success');
            return;
        }

        const newSnippet = {
            id: 'user_' + Date.now(),
            title: { en: titleVal, ar: titleVal },
            category: { en: catVal, ar: catVal },
            description: { en: descVal, ar: descVal },
            code: codeVal,
            language: langVal,
            isUser: true
        };

        this.userSnippets.push(newSnippet);
        this.saveToStorage();
        this.hideAddModal();
        this.renderCategories();
        const searchInput = document.getElementById('snippet-search');
        this.render(this.currentCategory, searchInput ? searchInput.value : '');
        App.showToast(App.t('msg_snippet_added') || 'Snippet added!', 'success');
        App.fireConfetti();
    },

    saveToStorage: function() {
        localStorage.setItem('wptoolbox_user_snippets', JSON.stringify(this.userSnippets));
        localStorage.setItem('wptoolbox_favs', JSON.stringify(this.favorites));
    },

    renderCategories: function() {
        const catContainer = document.getElementById('categories-list') || document.getElementById('categories');
        if (!catContainer) return;

        const allSnippets = [...this.data, ...this.userSnippets];
        const categories = {};

        allSnippets.forEach(s => {
            const cat = localized(s.category, 'General');
            categories[cat] = (categories[cat] || 0) + 1;
        });

        catContainer.replaceChildren();

        const buildBtn = (catKey, labelText, count, i18nKey = null) => {
            const isActive = this.currentCategory === catKey;
            const labelEl = App.h('span', {
                class: 'text-xs font-medium truncate',
                attrs: i18nKey ? { 'data-i18n': i18nKey } : {},
                text: labelText
            });
            const btn = App.h(
                'button',
                {
                    type: 'button',
                    class: `cat-btn px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${isActive ? 'active bg-zinc-800 border-primary/50 text-white' : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800 text-zinc-400'}`,
                    attrs: { 'aria-pressed': isActive ? 'true' : 'false' },
                    dataset: { category: catKey },
                    on: {
                        click: () => {
                            this.currentCategory = catKey;
                            const searchInput = document.getElementById('snippet-search');
                            this.render(this.currentCategory, searchInput ? searchInput.value : '');
                            this.renderCategories();
                        }
                    }
                },
                labelEl,
                App.h('span', {
                    class: 'text-[10px] font-bold bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800',
                    text: String(count)
                })
            );
            return btn;
        };

        catContainer.appendChild(buildBtn('all', App.t('cat_all') || 'All Snippets', allSnippets.length, 'cat_all'));
        catContainer.appendChild(buildBtn('favs', App.t('cat_favs') || 'Favorites', this.favorites.length, 'cat_favs'));

        Object.entries(categories).sort().forEach(([name, count]) => {
            catContainer.appendChild(buildBtn(name, name, count));
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
            filtered = filtered.filter(s => localized(s.category, 'General') === category);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                localized(s.title).toLowerCase().includes(query) ||
                localized(s.description).toLowerCase().includes(query) ||
                String(s.code || '').toLowerCase().includes(query)
            );
        }

        container.replaceChildren();

        if (filtered.length === 0) {
            container.appendChild(
                App.h(
                    'div',
                    { class: 'col-span-full py-20 text-center text-zinc-600 border-2 border-dashed border-zinc-900 rounded-3xl' },
                    App.h('i', { attrs: { 'data-lucide': 'search-x' }, class: 'w-12 h-12 mx-auto mb-4 opacity-20' }),
                    App.h('p', { attrs: { 'data-i18n': 'msg_no_snippets' }, text: App.t('msg_no_snippets') || 'No snippets found matching your criteria' })
                )
            );
        } else {
            filtered.forEach(s => {
                container.appendChild(this.createSnippetCard(s));
            });
        }

        renderIcons(container);
        App.translatePage();
    },

    createSnippetCard: function(s) {
        const isFav = this.favorites.includes(s.id);
        const title = localized(s.title, 'Snippet');
        const desc = localized(s.description, '');
        const cat = localized(s.category, 'General');
        const codeStr = String(s.code || '');

        const favBtn = App.h(
            'button',
            {
                type: 'button',
                class: `btn-fav w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isFav ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-zinc-950 border border-zinc-800 text-zinc-600 hover:text-rose-500'}`,
                attrs: {
                    'aria-label': isFav ? `Remove ${title} from favorites` : `Add ${title} to favorites`,
                    'aria-pressed': isFav ? 'true' : 'false'
                },
                on: { click: () => this.toggleFavorite(s.id) }
            },
            App.h('i', {
                attrs: { 'data-lucide': 'heart', ...(isFav ? { fill: 'currentColor' } : {}) },
                class: 'w-3.5 h-3.5'
            })
        );

        const editBtn = s.isUser
            ? App.h(
                'button',
                {
                    type: 'button',
                    class: 'btn-edit w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-600 hover:text-primary flex items-center justify-center transition-all',
                    attrs: { 'aria-label': `Edit ${title}` },
                    on: { click: () => this.showEditModal(s.id) }
                },
                App.h('i', { attrs: { 'data-lucide': 'pencil' }, class: 'w-3.5 h-3.5' })
            )
            : null;

        const deleteBtn = s.isUser
            ? App.h(
                'button',
                {
                    type: 'button',
                    class: 'btn-delete w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-600 hover:text-red-500 flex items-center justify-center transition-all',
                    attrs: { 'aria-label': `Delete ${title}` },
                    on: { click: () => this.deleteUserSnippet(s.id) }
                },
                App.h('i', { attrs: { 'data-lucide': 'trash-2' }, class: 'w-3.5 h-3.5' })
            )
            : null;

        const copyBtn = App.h(
            'button',
            {
                type: 'button',
                class: 'btn-copy h-8 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-primary hover:border-primary transition-all',
                attrs: { 'aria-label': `Copy code for ${title}` },
                on: { click: (e) => App.copyToClipboard(codeStr, e.currentTarget) }
            },
            App.h('i', { attrs: { 'data-lucide': 'copy' }, class: 'w-3 h-3' }),
            App.h('span', { attrs: { 'data-i18n': 'copy_btn' }, text: App.t('copy_btn') || 'Copy' })
        );

        return App.h(
            'div',
            { class: 'snippet-card min-w-0 group shadcn-card p-6 bg-zinc-900/20 hover:bg-zinc-900/40 border-zinc-900 transition-all' },
            App.h(
                'div',
                { class: 'flex flex-wrap justify-between items-start gap-2 mb-4' },
                App.h(
                    'div',
                    { class: 'space-y-1 min-w-0' },
                    App.h(
                        'div',
                        { class: 'flex items-center gap-2 flex-wrap' },
                        App.h('h2', { class: 'text-sm font-bold text-white group-hover:text-primary transition-colors break-words', text: title }),
                        s.isUser
                            ? App.h('span', {
                                class: 'px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase tracking-widest border border-amber-500/20',
                                text: 'Custom'
                            })
                            : null
                    ),
                    App.h(
                        'p',
                        { class: 'text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-1.5' },
                        App.h('i', { attrs: { 'data-lucide': 'tag' }, class: 'w-3 h-3' }),
                        App.h('span', { text: cat })
                    )
                ),
                App.h('div', { class: 'flex gap-1.5 shrink-0' }, favBtn, editBtn, deleteBtn)
            ),
            App.h('p', { class: 'text-xs text-zinc-500 leading-relaxed mb-6 line-clamp-2', text: desc }),
            App.h(
                'div',
                { class: 'relative group/code min-w-0' },
                App.h(
                    'div',
                    { class: 'absolute top-3 end-3 flex gap-2 opacity-0 group-hover/code:opacity-100 group-focus-within/code:opacity-100 transition-all translate-y-1 group-hover/code:translate-y-0 group-focus-within/code:translate-y-0' },
                    copyBtn
                ),
                App.h(
                    'pre',
                    { class: 'p-4 rounded-xl bg-zinc-950 border border-zinc-900 text-[11px] font-mono text-zinc-400 overflow-x-auto max-h-[120px] scrollbar-thin max-w-full' },
                    App.h('code', { text: codeStr })
                )
            )
        );
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

    deleteUserSnippet: async function(id) {
        const ok = await App.confirm(App.t('msg_confirm_delete_snippet') || 'Delete this snippet?', { danger: true });
        if (!ok) return;
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
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    const cleaned = sanitizeUserSnippets(imported);
                    const existingIds = new Set(this.userSnippets.map(s => s.id));
                    const newSnippets = cleaned.filter(s => !existingIds.has(s.id));
                    this.userSnippets = [...this.userSnippets, ...newSnippets];
                    this.saveToStorage();
                    this.renderCategories();
                    this.render();
                    App.showToast(App.t('msg_import_success') || 'Snippets imported!', 'success');
                }
            } catch {
                App.showToast(App.t('msg_import_fail') || 'Invalid file format.', 'error');
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    }
});
