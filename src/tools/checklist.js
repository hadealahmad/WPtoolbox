/**
 * Project Checklist - WordPress Deployment Checklist Logic
 */
import '../main.js';
import { App } from '../core/app.js';
import checklistData from '../data/checklist-data.json';

export const Checklist = App.registerTool('Checklist', {
    sites: [],
    activeSiteId: null,

    onInit: function() {
        this.loadSites();
        this.bindEvents();
        
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
        
        if (addSiteBtn) addSiteBtn.onclick = () => this.addSite();
        if (importBtn && importInput) importBtn.onclick = () => importInput.click();
        if (importInput) importInput.onchange = (e) => this.importAll(e);
        if (exportBtn) exportBtn.onclick = () => this.exportAll();

        // Modal buttons
        const modalClose = document.getElementById('modal-close-btn');
        const modalCancel = document.getElementById('modal-cancel-btn');
        if (modalClose) modalClose.onclick = () => this.hideModal();
        if (modalCancel) modalCancel.onclick = () => this.hideModal();
    },

    loadSites: function() {
        const saved = localStorage.getItem('wptoolbox_checklist_sites');
        this.sites = saved ? JSON.parse(saved) : [];
        this.renderSites();
    },

    saveSites: function() {
        localStorage.setItem('wptoolbox_checklist_sites', JSON.stringify(this.sites));
        this.renderSites();
    },

    renderSites: function() {
        const container = document.getElementById('sites-list');
        if (!container) return;

        container.innerHTML = '';
        
        if (this.sites.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-2xl">
                    <p data-i18n="msg_no_sites">No sites added yet.</p>
                </div>
            `;
            App.translatePage();
            return;
        }

        this.sites.forEach(site => {
            const completed = site.tasks.filter(t => t.completed).length;
            const total = site.tasks.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            const card = document.createElement('div');
            card.className = `group p-4 rounded-xl border transition-all cursor-pointer ${this.activeSiteId === site.id ? 'border-primary bg-primary/5' : 'border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40'}`;
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="min-w-0">
                        <h3 class="text-sm font-bold text-white truncate">${site.name}</h3>
                        <p class="text-[10px] text-zinc-500 truncate">${site.url || ''}</p>
                    </div>
                    <button class="btn-delete-site opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-500 transition-all">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
                <div class="space-y-1.5">
                    <div class="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                        <span class="${percent === 100 ? 'text-emerald-500' : 'text-zinc-500'}">${percent}%</span>
                        <span class="text-zinc-500">${completed}/${total}</span>
                    </div>
                    <div class="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                        <div class="h-full bg-primary transition-all" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;

            card.onclick = (e) => {
                if (e.target.closest('.btn-delete-site')) return;
                this.selectSite(site.id);
            };

            card.querySelector('.btn-delete-site').onclick = (e) => {
                e.stopPropagation();
                this.deleteSite(site.id);
            };

            container.appendChild(card);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
        App.translatePage();
    },

    addSite: function() {
        const name = prompt(App.t('prompt_site_name') || "Enter site name:");
        if (!name) return;

        const url = prompt(App.t('prompt_site_url') || "Enter site URL (optional):") || "";

        const newSite = {
            id: Date.now().toString(),
            name,
            url,
            tasks: JSON.parse(JSON.stringify(checklistData)).map(task => ({
                ...task,
                completed: false
            }))
        };

        this.sites.push(newSite);
        this.saveSites();
        this.selectSite(newSite.id);
    },

    deleteSite: function(id) {
        if (!confirm(App.t('confirm_delete_site') || "Are you sure?")) return;
        this.sites = this.sites.filter(s => s.id !== id);
        if (this.activeSiteId === id) {
            this.activeSiteId = null;
            document.getElementById('checklist-content').classList.add('hidden');
            document.getElementById('empty-checklist').classList.remove('hidden');
        }
        this.saveSites();
    },

    selectSite: function(id) {
        this.activeSiteId = id;
        this.renderSites();
        this.renderChecklist();
        document.getElementById('empty-checklist').classList.add('hidden');
        document.getElementById('checklist-content').classList.remove('hidden');
    },

    renderChecklist: function() {
        const site = this.sites.find(s => s.id === this.activeSiteId);
        if (!site) return;

        document.getElementById('active-site-name').textContent = site.name;
        const container = document.getElementById('tasks-container');
        if (!container) return;

        container.innerHTML = '';
        
        // Group tasks by category
        const groups = {};
        site.tasks.forEach(task => {
            const cat = task.category[App.currentLang] || task.category['en'];
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(task);
        });

        Object.entries(groups).forEach(([category, tasks]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'space-y-4';
            groupDiv.innerHTML = `
                <h4 class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                    ${category}
                </h4>
                <div class="space-y-2"></div>
            `;

            const tasksDiv = groupDiv.querySelector('div');
            tasks.forEach(task => {
                const item = document.createElement('div');
                item.className = `flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${task.completed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800'}`;
                item.innerHTML = `
                    <div class="relative flex items-center justify-center">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                            class="peer appearance-none w-5 h-5 rounded-md border-2 border-zinc-800 checked:border-emerald-500 checked:bg-emerald-500 transition-all cursor-pointer">
                        <i data-lucide="check" class="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-all"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-xs font-bold ${task.completed ? 'text-zinc-400 line-through' : 'text-white'}">${task.title[App.currentLang] || task.title['en']}</p>
                        <p class="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">${task.description[App.currentLang] || task.description['en']}</p>
                    </div>
                `;

                item.onclick = () => this.toggleTask(task.id);
                tasksDiv.appendChild(item);
            });

            container.appendChild(groupDiv);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
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
            if (completed === site.tasks.length) {
                App.fireConfetti();
                App.showToast(App.t('msg_all_done') || "Excellent! All tasks completed.");
            }
        }
    },

    exportAll: function() {
        const data = JSON.stringify(this.sites, null, 2);
        App.downloadFile(data, 'checklist-export.json', 'application/json');
    },

    importAll: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    this.sites = imported;
                    this.saveSites();
                    App.showToast(App.t('msg_import_success') || "Imported successfully!");
                }
            } catch (err) {
                App.showToast(App.t('msg_import_fail') || "Invalid file format.");
            }
        };
        reader.readAsText(file);
    }
});
