/**
 * Project Checklist - WordPress Deployment Checklist Logic
 */
import '../main.js';
import { App } from '../core/app.js';
import { renderIcons } from '../core/icons.js';
import checklistData from '../data/checklist-data.json';
import { getSafeHttpUrl, sanitizeImportedSites } from '../core/sanitizers.js';

export { getSafeHttpUrl, sanitizeImportedSites };

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

function getLocalizedText(field, fallback = '') {
    if (field && typeof field === 'object') {
        return String(field[App.currentLang] || field.en || field.ar || fallback);
    }
    return String(field || fallback);
}

function getTaskCategoryKey(task) {
    const id = String(task?.id || '').toLowerCase();
    const catEn = String(task?.category?.en || task?.category || '').toLowerCase();
    if (id.startsWith('seo-') || catEn.includes('seo')) return 'seo';
    if (id.startsWith('woo-') || catEn.includes('woo')) return 'woo';
    return 'wp';
}

export const Checklist = App.registerTool('Checklist', {
    sites: [],
    activeSiteId: null,
    activeCategory: 'all',
    editingTaskId: null,

    onInit: function() {
        this.bindEvents();
        this.loadSites();

        window.addEventListener('languageChanged', () => {
            this.renderSites();
            if (this.activeSiteId) this.renderChecklist();
        });
    },

    bindEvents: function() {
        const addSiteBtn = document.getElementById('add-site-btn');
        const importBtn = document.getElementById('import-btn');
        const exportBtn = document.getElementById('export-btn');
        const importInput = document.getElementById('import-input');

        if (addSiteBtn) addSiteBtn.onclick = () => this.openSiteModal();
        if (importBtn && importInput) importBtn.onclick = () => importInput.click();
        if (importInput) importInput.onchange = (e) => this.importAll(e);
        if (exportBtn) exportBtn.onclick = () => this.exportAll();

        // Site modal
        const siteModal = document.getElementById('site-modal');
        const siteModalCard = document.getElementById('site-modal-card');
        const closeSiteModalBtn = document.getElementById('close-site-modal-btn');
        const confirmAddSiteBtn = document.getElementById('confirm-add-site-btn');
        const siteNameInput = document.getElementById('site-name-input');
        const siteUrlInput = document.getElementById('site-url-input');

        if (siteModal) {
            attachBackdropDismiss(siteModal, siteModalCard, () => this.closeSiteModal());
            siteModal.addEventListener('close', () => {
                if (siteNameInput) siteNameInput.value = '';
                if (siteUrlInput) siteUrlInput.value = '';
            });
        }
        if (closeSiteModalBtn) closeSiteModalBtn.onclick = () => this.closeSiteModal();
        if (confirmAddSiteBtn) confirmAddSiteBtn.onclick = () => this.confirmAddSite();
        [siteNameInput, siteUrlInput].forEach(inp => {
            if (inp) {
                inp.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.confirmAddSite();
                    }
                });
            }
        });

        // Edit task modal
        const editModal = document.getElementById('edit-modal');
        const editModalCard = document.getElementById('edit-modal-card');
        const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
        const saveEditTaskBtn = document.getElementById('save-edit-task-btn');

        if (editModal) {
            attachBackdropDismiss(editModal, editModalCard, () => this.closeEditModal());
            editModal.addEventListener('close', () => {
                this.editingTaskId = null;
            });
        }
        if (closeEditModalBtn) closeEditModalBtn.onclick = () => this.closeEditModal();
        if (saveEditTaskBtn) saveEditTaskBtn.onclick = () => this.saveEditTask();

        // Add custom task
        const newTaskInput = document.getElementById('new-task-input');
        const addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) addTaskBtn.onclick = () => this.addCustomTask();
        if (newTaskInput) {
            newTaskInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addCustomTask();
                }
            });
        }

        // Category filters
        document.querySelectorAll('#category-filters .filter-btn').forEach(btn => {
            btn.onclick = () => this.setCategory(btn.dataset.category || 'all');
        });
    },

    loadSites: function() {
        try {
            const saved = localStorage.getItem('wptoolbox_checklist_sites');
            this.sites = saved ? sanitizeImportedSites(JSON.parse(saved)) : [];
        } catch {
            this.sites = [];
        }
        this.activeSiteId = localStorage.getItem('wptoolbox_checklist_active_site') || null;
        if (this.activeSiteId && !this.sites.some(s => s.id === this.activeSiteId)) {
            this.activeSiteId = null;
        }
        this.renderSites();
        if (this.activeSiteId) {
            this.selectSite(this.activeSiteId);
        } else {
            this.updateProgressAndCounts(null);
        }
    },

    saveSites: function() {
        localStorage.setItem('wptoolbox_checklist_sites', JSON.stringify(this.sites));
        localStorage.setItem('wptoolbox_checklist_active_site', this.activeSiteId || '');
        this.renderSites();
    },

    setCategory: function(category) {
        this.activeCategory = category || 'all';
        document.querySelectorAll('#category-filters .filter-btn').forEach(btn => {
            const isActive = (btn.dataset.category || 'all') === this.activeCategory;
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            btn.classList.toggle('active', isActive);
            btn.classList.toggle('border-primary/40', isActive);
            btn.classList.toggle('bg-zinc-900/80', isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('border-zinc-800', !isActive);
            btn.classList.toggle('bg-zinc-900/50', !isActive);
        });
        if (this.activeSiteId) {
            this.renderChecklist();
        }
    },

    updateProgressAndCounts: function(site) {
        const progressEl = document.getElementById('active-site-progress');
        const progressBar = document.getElementById('active-site-progress-bar');
        const countAll = document.getElementById('count-all');
        const countWp = document.getElementById('count-wp');
        const countSeo = document.getElementById('count-seo');
        const countWoo = document.getElementById('count-woo');

        if (!site) {
            if (progressEl) progressEl.textContent = '0%';
            if (progressBar) progressBar.style.width = '0%';
            if (countAll) countAll.textContent = '0';
            if (countWp) countWp.textContent = '0';
            if (countSeo) countSeo.textContent = '0';
            if (countWoo) countWoo.textContent = '0';
            return;
        }

        const total = site.tasks.length;
        const completed = site.tasks.filter(t => t.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        if (progressEl) progressEl.textContent = `${percent}%`;
        if (progressBar) progressBar.style.width = `${percent}%`;

        let wp = 0, seo = 0, woo = 0;
        site.tasks.forEach(t => {
            const key = getTaskCategoryKey(t);
            if (key === 'seo') seo++;
            else if (key === 'woo') woo++;
            else wp++;
        });
        if (countAll) countAll.textContent = String(total);
        if (countWp) countWp.textContent = String(wp);
        if (countSeo) countSeo.textContent = String(seo);
        if (countWoo) countWoo.textContent = String(woo);
    },

    openSiteModal: function() {
        const modal = document.getElementById('site-modal');
        const nameInput = document.getElementById('site-name-input');
        const urlInput = document.getElementById('site-url-input');
        if (nameInput) nameInput.value = '';
        if (urlInput) urlInput.value = '';
        if (modal && typeof modal.showModal === 'function' && !modal.open) {
            modal.showModal();
            nameInput?.focus();
        }
    },

    closeSiteModal: function() {
        const modal = document.getElementById('site-modal');
        if (modal && modal.open) modal.close();
    },

    confirmAddSite: function() {
        const nameInput = document.getElementById('site-name-input');
        const urlInput = document.getElementById('site-url-input');
        const name = nameInput?.value.trim() || '';
        const rawUrl = urlInput?.value.trim() || '';

        if (!name) {
            nameInput?.reportValidity?.();
            nameInput?.focus();
            return;
        }

        const safeUrl = rawUrl ? getSafeHttpUrl(rawUrl) : '';
        if (rawUrl && !safeUrl) {
            urlInput?.reportValidity?.();
            urlInput?.focus();
            App.showToast('URL must start with http:// or https://', 'error');
            return;
        }

        const newSite = {
            id: Date.now().toString(),
            name,
            url: safeUrl,
            tasks: JSON.parse(JSON.stringify(checklistData)).map(task => ({
                ...task,
                completed: false
            }))
        };

        this.sites.push(newSite);
        this.closeSiteModal();
        this.saveSites();
        this.selectSite(newSite.id);
        App.fireConfetti();
    },

    openEditModal: function(taskId) {
        const site = this.sites.find(s => s.id === this.activeSiteId);
        const task = site?.tasks.find(t => t.id === taskId);
        const modal = document.getElementById('edit-modal');
        const input = document.getElementById('edit-task-input');
        if (!task || !modal || !input) return;

        this.editingTaskId = taskId;
        input.value = getLocalizedText(task.title, '');
        if (typeof modal.showModal === 'function' && !modal.open) {
            modal.showModal();
            input.focus();
        }
    },

    closeEditModal: function() {
        const modal = document.getElementById('edit-modal');
        if (modal && modal.open) modal.close();
        this.editingTaskId = null;
    },

    saveEditTask: function() {
        const site = this.sites.find(s => s.id === this.activeSiteId);
        const task = site?.tasks.find(t => t.id === this.editingTaskId);
        const input = document.getElementById('edit-task-input');
        const nextTitle = input?.value.trim() || '';
        if (!nextTitle) {
            input?.reportValidity?.();
            input?.focus();
            return;
        }
        if (task) {
            if (!task.title || typeof task.title !== 'object') {
                task.title = { en: nextTitle, ar: nextTitle };
            } else {
                task.title[App.currentLang] = nextTitle;
                if (!task.title.en) task.title.en = nextTitle;
                if (!task.title.ar) task.title.ar = nextTitle;
            }
            this.closeEditModal();
            this.saveSites();
            this.renderChecklist();
        }
    },

    addCustomTask: function() {
        const site = this.sites.find(s => s.id === this.activeSiteId);
        const input = document.getElementById('new-task-input');
        const title = input?.value.trim() || '';
        if (!site || !title) {
            input?.focus();
            return;
        }
        site.tasks.push({
            id: `custom-${Date.now()}`,
            category: { en: 'Custom', ar: 'مخصص' },
            title: { en: title, ar: title },
            description: { en: '', ar: '' },
            completed: false
        });
        input.value = '';
        this.saveSites();
        this.renderChecklist();
    },

    renderSites: function() {
        const container = document.getElementById('sites-list');
        if (!container) return;

        container.replaceChildren();

        if (this.sites.length === 0) {
            container.appendChild(
                App.h(
                    'div',
                    { class: 'p-8 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-2xl' },
                    App.h('p', { attrs: { 'data-i18n': 'msg_no_sites' }, text: App.t('msg_no_sites') || 'No sites added yet.' })
                )
            );
            App.translatePage();
            return;
        }

        this.sites.forEach(site => {
            const siteName = String(site.name || 'Site');
            const completed = site.tasks.filter(t => t.completed).length;
            const total = site.tasks.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isSelected = this.activeSiteId === site.id;

            const selectBtn = App.h(
                'button',
                {
                    type: 'button',
                    class: 'flex-1 min-w-0 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1',
                    attrs: {
                        'aria-pressed': isSelected ? 'true' : 'false',
                        'aria-label': `Select site ${siteName}`
                    },
                    on: { click: () => this.selectSite(site.id) }
                },
                App.h(
                    'div',
                    { class: 'min-w-0 mb-3' },
                    App.h('h3', { class: 'text-sm font-bold text-white truncate', text: siteName }),
                    site.url ? App.h('p', { class: 'text-[10px] text-zinc-500 truncate', text: String(site.url) }) : null
                ),
                App.h(
                    'div',
                    { class: 'space-y-1.5' },
                    App.h(
                        'div',
                        { class: 'flex justify-between text-[10px] font-bold uppercase tracking-tighter' },
                        App.h('span', { class: percent === 100 ? 'text-emerald-500' : 'text-zinc-500', text: `${percent}%` }),
                        App.h('span', { class: 'text-zinc-500', text: `${completed}/${total}` })
                    ),
                    App.h(
                        'div',
                        { class: 'h-1 w-full bg-zinc-950 rounded-full overflow-hidden' },
                        App.h('div', { class: 'h-full bg-primary transition-all', style: { width: `${percent}%` } })
                    )
                )
            );

            const delBtn = App.h(
                'button',
                {
                    type: 'button',
                    class: 'btn-delete-site opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 p-1.5 text-zinc-600 hover:text-red-500 transition-all shrink-0 self-start rounded-lg',
                    attrs: { 'aria-label': `Delete site ${siteName}` },
                    on: { click: () => this.deleteSite(site.id) }
                },
                App.h('i', { attrs: { 'data-lucide': 'trash-2' }, class: 'w-3.5 h-3.5' })
            );

            const card = App.h(
                'div',
                {
                    class: `group flex items-stretch gap-2 p-3 rounded-xl border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40'}`
                },
                selectBtn,
                delBtn
            );

            container.appendChild(card);
        });

        renderIcons(container);
        App.translatePage();
    },

    deleteSite: async function(id) {
        const ok = await App.confirm(App.t('confirm_delete_site') || 'Are you sure?', { danger: true });
        if (!ok) return;
        this.sites = this.sites.filter(s => s.id !== id);
        if (this.activeSiteId === id) {
            this.activeSiteId = null;
            document.getElementById('checklist-content')?.classList.add('hidden');
            document.getElementById('empty-checklist')?.classList.remove('hidden');
            this.updateProgressAndCounts(null);
        }
        this.saveSites();
    },

    selectSite: function(id) {
        this.activeSiteId = id;
        localStorage.setItem('wptoolbox_checklist_active_site', id || '');
        this.renderSites();
        this.renderChecklist();
        document.getElementById('empty-checklist')?.classList.add('hidden');
        document.getElementById('checklist-content')?.classList.remove('hidden');
    },

    renderChecklist: function() {
        const site = this.sites.find(s => s.id === this.activeSiteId);
        if (!site) return;

        const nameEl = document.getElementById('active-site-name');
        if (nameEl) nameEl.textContent = String(site.name || '');

        const urlWrap = document.getElementById('active-site-url-wrap');
        if (urlWrap) {
            urlWrap.replaceChildren();
            const safeHref = getSafeHttpUrl(site.url);
            if (safeHref) {
                urlWrap.appendChild(
                    App.h(
                        'a',
                        {
                            attrs: { href: safeHref, target: '_blank', rel: 'noopener noreferrer' },
                            class: 'text-xs text-primary hover:underline flex items-center gap-1 break-all min-w-0'
                        },
                        App.h('span', { text: safeHref }),
                        App.h('i', { attrs: { 'data-lucide': 'external-link' }, class: 'w-3 h-3 shrink-0' })
                    )
                );
                renderIcons(urlWrap);
            }
        }

        this.updateProgressAndCounts(site);

        const container = document.getElementById('tasks-container');
        if (!container) return;

        container.replaceChildren();

        const visibleTasks = this.activeCategory === 'all'
            ? site.tasks
            : site.tasks.filter(t => getTaskCategoryKey(t) === this.activeCategory);

        // Group tasks by category
        const groups = {};
        visibleTasks.forEach(task => {
            const cat = getLocalizedText(task.category, 'General');
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(task);
        });

        Object.entries(groups).forEach(([category, tasks]) => {
            const tasksDiv = App.h('div', { class: 'space-y-2' });
            const groupDiv = App.h(
                'div',
                { class: 'space-y-4' },
                App.h(
                    'h3',
                    { class: 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2' },
                    App.h('span', { class: 'w-1.5 h-1.5 rounded-full bg-primary/40' }),
                    App.h('span', { text: category })
                ),
                tasksDiv
            );

            tasks.forEach(task => {
                const taskTitle = getLocalizedText(task.title, '');
                const taskDesc = getLocalizedText(task.description, '');
                const cbId = `task-cb-${String(task.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

                const checkbox = App.h('input', {
                    attrs: { type: 'checkbox', id: cbId, ...(task.completed ? { checked: '' } : {}) },
                    class: 'peer appearance-none w-5 h-5 rounded-md border-2 border-zinc-800 checked:border-emerald-500 checked:bg-emerald-500 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                });
                checkbox.checked = !!task.completed;
                checkbox.onchange = () => this.toggleTask(task.id);

                const labelRow = App.h(
                    'label',
                    {
                        attrs: { for: cbId },
                        class: 'flex-1 min-w-0 flex items-center gap-4 cursor-pointer'
                    },
                    App.h(
                        'div',
                        { class: 'relative flex items-center justify-center shrink-0' },
                        checkbox,
                        App.h('i', {
                            attrs: { 'data-lucide': 'check' },
                            class: 'absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-all'
                        })
                    ),
                    App.h(
                        'div',
                        { class: 'flex-1 min-w-0' },
                        App.h('p', {
                            class: `text-xs font-bold break-words ${task.completed ? 'text-zinc-400 line-through' : 'text-white'}`,
                            text: taskTitle
                        }),
                        taskDesc ? App.h('p', { class: 'text-[10px] text-zinc-500 mt-0.5 line-clamp-1', text: taskDesc }) : null
                    )
                );

                const editBtn = App.h(
                    'button',
                    {
                        type: 'button',
                        class: 'btn-edit-task opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 p-1.5 text-zinc-600 hover:text-primary rounded-lg transition-all shrink-0',
                        attrs: { 'aria-label': `Edit ${taskTitle}` },
                        on: { click: () => this.openEditModal(task.id) }
                    },
                    App.h('i', { attrs: { 'data-lucide': 'pencil' }, class: 'w-3.5 h-3.5' })
                );

                const item = App.h(
                    'div',
                    {
                        class: `group flex items-center gap-3 p-4 rounded-xl border transition-all min-w-0 ${task.completed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800'}`
                    },
                    labelRow,
                    editBtn
                );

                tasksDiv.appendChild(item);
            });

            container.appendChild(groupDiv);
        });

        renderIcons(container);
    },

    toggleTask: function(taskId) {
        const site = this.sites.find(s => s.id === this.activeSiteId);
        if (!site) return;

        const task = site.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveSites();
            this.renderChecklist();

            // Fire confetti on 100%
            const completed = site.tasks.filter(t => t.completed).length;
            if (completed === site.tasks.length && site.tasks.length > 0) {
                App.fireConfetti();
                App.showToast(App.t('msg_all_done') || 'Excellent! All tasks completed.', 'success');
            }
        }
    },

    exportAll: function() {
        const data = JSON.stringify(this.sites, null, 2);
        App.downloadFile(data, 'checklist-export.json', 'application/json');
    },

    importAll: function(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    this.sites = sanitizeImportedSites(imported);
                    if (this.sites.length > 0) {
                        this.activeSiteId = this.sites[0].id;
                    } else {
                        this.activeSiteId = null;
                    }
                    this.saveSites();
                    if (this.activeSiteId) {
                        this.selectSite(this.activeSiteId);
                    } else {
                        document.getElementById('checklist-content')?.classList.add('hidden');
                        document.getElementById('empty-checklist')?.classList.remove('hidden');
                    }
                    App.showToast(App.t('msg_import_success') || 'Imported successfully!', 'success');
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
