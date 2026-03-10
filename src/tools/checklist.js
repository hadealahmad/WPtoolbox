/**
 * Website Checklist Module
 * Supports multiple sites, 3-column layout, and task management.
 */
import '../main.js';
import { App } from '../core/app.js';

export const Checklist = {
    sites: [],
    activeSiteId: null,
    currentCategory: 'all',
    editingTaskId: null,

    presets: [
        { id: 'wp-1', text: { en: 'Connect SMTP or Check Mail sending', ar: 'ربط SMTP أو التأكد من إرسال البريد' }, category: 'wp' },
        { id: 'wp-2', text: { en: 'Create a Privacy Policy Page', ar: 'إنشاء صفحة سياسة الخصوصية' }, category: 'wp' },
        { id: 'wp-3', text: { en: 'Create a Terms and Conditions page', ar: 'إنشاء صفحة الشروط والأحكام' }, category: 'wp' },
        { id: 'wp-4', text: { en: 'Allow Google To crawl pages from wordpress settings', ar: 'السماح لمحركات البحث بفهرسة الموقع من إعدادات ووردبريس' }, category: 'wp' },
        { id: 'wp-5', text: { en: 'Configure Permalinks to Post Name', ar: 'ضبط الروابط الدائمة إلى اسم المقال' }, category: 'wp' },
        { id: 'wp-6', text: { en: 'Remove default "Hello World" post and "Sample Page"', ar: 'حذف مقال "أهلاً بالعالم" والصفحة الافتراضية' }, category: 'wp' },
        { id: 'seo-1', text: { en: 'Connect google analytics', ar: 'ربط إحصائيات جوجل' }, category: 'seo' },
        { id: 'seo-2', text: { en: 'Verify on Google Search Console', ar: 'تفعيل أدوات مشرفي المواقع جوجل' }, category: 'seo' },
        { id: 'seo-3', text: { en: 'Add Default image for Posts without Featured Image in Rankmath settings', ar: 'إضافة صورة افتراضية للمقالات بدون صورة بارزة في إعدادات Rankmath' }, category: 'seo' },
        { id: 'seo-4', text: { en: 'Configure XML Sitemap', ar: 'إعداد الخريطة البرمجية XML Sitemap' }, category: 'seo' },
        { id: 'woo-1', text: { en: 'Set Store Address and Currency', ar: 'ضبط عنوان المتجر والعملة' }, category: 'woo' },
        { id: 'woo-2', text: { en: 'Configure Shipping Zones', ar: 'إعداد مناطق الشحن' }, category: 'woo' },
        { id: 'woo-3', text: { en: 'Test Checkout Process (Dummy Order)', ar: 'تجربة عملية الشراء (طلب تجريبي)' }, category: 'woo' },
        { id: 'woo-4', text: { en: 'Set Up Tax Rates', ar: 'ضبط الضرائب' }, category: 'woo' }
    ],

    init: () => {
        // Load sites from localStorage
        const saved = localStorage.getItem('wptoolbox_checklists_v3');
        if (saved) {
            Checklist.sites = JSON.parse(saved);
        } else {
            // Initial default site
            Checklist.addSite('My Project', true);
        }

        if (Checklist.sites.length > 0 && !Checklist.activeSiteId) {
            Checklist.activeSiteId = Checklist.sites[0].id;
        }

        Checklist.renderSites();
        Checklist.renderTasks();
        Checklist.updateStats();

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            Checklist.renderSites();
            Checklist.renderTasks();
            Checklist.updateStats();
        });

        // Setup import listener
        const importInput = document.getElementById('import-all-input');
        if (importInput) {
            importInput.addEventListener('change', Checklist.handleImport);
        }

        // Enter key for new task
        const taskInput = document.getElementById('new-task-input');
        if (taskInput) {
            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') Checklist.addTask();
            });
        }
    },

    // --- Site Management ---

    addSite: (name, isInternal = false) => {
        const siteName = name || document.getElementById('site-name-input').value.trim();
        if (!siteName) return;

        const newSite = {
            id: 'site_' + Date.now(),
            name: siteName,
            items: Checklist.presets.map(p => ({
                id: p.id + '_' + Date.now() + Math.random().toString(36).substr(2, 5),
                text: JSON.parse(JSON.stringify(p.text)),
                category: p.category,
                completed: false
            }))
        };

        Checklist.sites.push(newSite);
        Checklist.activeSiteId = newSite.id;
        Checklist.save();

        if (!isInternal) {
            Checklist.closeSiteModal();
            App.showToast(App.t('msg_site_added'));
            App.fireConfetti();
        }

        Checklist.renderSites();
        Checklist.renderTasks();
        Checklist.updateStats();
    },

    deleteSite: (id, e) => {
        if (e) e.stopPropagation();
        if (!confirm(App.t('msg_confirm_delete_site'))) return;

        Checklist.sites = Checklist.sites.filter(s => s.id !== id);
        if (Checklist.activeSiteId === id) {
            Checklist.activeSiteId = Checklist.sites.length > 0 ? Checklist.sites[0].id : null;
        }
        
        Checklist.save();
        Checklist.renderSites();
        Checklist.renderTasks();
        Checklist.updateStats();
        App.showToast(App.t('msg_site_deleted'));
    },

    setActiveSite: (id) => {
        Checklist.activeSiteId = id;
        Checklist.renderSites();
        Checklist.renderTasks();
        Checklist.updateStats();
    },

    // --- Task Management ---

    addTask: () => {
        const input = document.getElementById('new-task-input');
        const text = input.value.trim();
        if (!text || !Checklist.activeSiteId) return;

        const site = Checklist.sites.find(s => s.id === Checklist.activeSiteId);
        if (!site) return;

        const newTask = {
            id: 'task_' + Date.now(),
            text: { en: text, ar: text },
            category: Checklist.currentCategory === 'all' ? 'wp' : Checklist.currentCategory,
            completed: false
        };

        site.items.unshift(newTask);
        input.value = '';
        Checklist.save();
        Checklist.renderTasks();
        Checklist.updateStats();
    },

    toggleTask: (taskId) => {
        const site = Checklist.sites.find(s => s.id === Checklist.activeSiteId);
        if (!site) return;

        const item = site.items.find(i => i.id === taskId);
        if (item) {
            item.completed = !item.completed;
            Checklist.save();
            Checklist.renderTasks();
            Checklist.updateStats();
        }
    },

    deleteTask: (taskId) => {
        const site = Checklist.sites.find(s => s.id === Checklist.activeSiteId);
        if (!site) return;

        site.items = site.items.filter(i => i.id !== taskId);
        Checklist.save();
        Checklist.renderTasks();
        Checklist.updateStats();
    },

    // --- Renderers ---

    renderSites: () => {
        const container = document.getElementById('sites-list');
        if (!container) return;

        container.innerHTML = Checklist.sites.map(site => {
            const completed = site.items.filter(i => i.completed).length;
            const total = site.items.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isActive = site.id === Checklist.activeSiteId;

            return `
                <div onclick="Checklist.setActiveSite('${site.id}')" 
                     class="group p-4 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-zinc-800 border-primary shadow-lg ring-1 ring-primary/20' : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800'}">
                     <div class="flex justify-between items-start mb-2">
                        <span class="text-sm font-bold ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}">${site.name}</span>
                        <button onclick="Checklist.deleteSite('${site.id}', event)" class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                    <div class="flex items-center justify-between text-[10px] font-mono mb-1.5">
                        <span class="${isActive ? 'text-primary' : 'text-zinc-600'}">${percent}%</span>
                        <span class="text-zinc-700">${completed}/${total}</span>
                    </div>
                    <div class="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div class="h-full bg-primary ${isActive ? 'opacity-100' : 'opacity-30'} transition-all duration-700" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    },

    renderTasks: () => {
        const container = document.getElementById('tasks-container');
        if (!container) return;

        const site = Checklist.sites.find(s => s.id === Checklist.activeSiteId);
        if (!site) {
            container.innerHTML = `<div class="py-20 text-center text-zinc-600 border-2 border-dashed border-zinc-900 rounded-3xl">Select a site to view tasks</div>`;
            return;
        }

        const filtered = Checklist.currentCategory === 'all' 
            ? site.items 
            : site.items.filter(i => i.category === Checklist.currentCategory);

        if (filtered.length === 0) {
            container.innerHTML = `<div class="py-20 text-center text-zinc-600 border-2 border-dashed border-zinc-900 rounded-3xl">No tasks in this category</div>`;
            return;
        }

        container.innerHTML = filtered.map(item => `
            <div class="task-item group flex items-start gap-4 p-5 rounded-2xl border bg-zinc-900/30 hover:bg-zinc-900/60 transition-all ${item.completed ? 'opacity-60' : ''}">
                <button onclick="Checklist.toggleTask('${item.id}')" 
                        class="checkbox-btn mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.completed ? 'completed text-white' : 'text-transparent'}">
                    <i data-lucide="check" class="w-4 h-4"></i>
                </button>
                <div class="flex-1 min-w-0">
                    <p class="text-[15px] leading-relaxed transition-all ${item.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'} whitespace-normal break-words">${item.text[App.currentLang] || item.text['en']}</p>
                    <div class="flex items-center gap-4 mt-3 opacity-0 group-hover:opacity-100 transition-all">
                        <span class="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] font-bold uppercase tracking-widest text-zinc-600">${App.t('cat_' + item.category)}</span>
                        
                        <div class="h-3 w-px bg-zinc-800"></div>

                        <button onclick="Checklist.openEditModal('${item.id}')" class="text-zinc-500 hover:text-primary flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            <span data-i18n="btn_edit">${App.t('btn_edit')}</span>
                        </button>
                        <button onclick="Checklist.deleteTask('${item.id}')" class="text-zinc-500 hover:text-red-400 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            <span data-i18n="btn_delete">${App.t('btn_delete')}</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    },

    updateStats: () => {
        const site = Checklist.sites.find(s => s.id === Checklist.activeSiteId);
        
        // Refresh the sidebar sites list to update their individual progress bars
        Checklist.renderSites();

        if (!site) return;

        const counts = {
            all: site.items.length,
            wp: site.items.filter(i => i.category === 'wp').length,
            seo: site.items.filter(i => i.category === 'seo').length,
            woo: site.items.filter(i => i.category === 'woo').length
        };

        const completed = site.items.filter(i => i.completed).length;
        const total = site.items.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('count-all').textContent = counts.all;
        document.getElementById('count-wp').textContent = counts.wp;
        document.getElementById('count-seo').textContent = counts.seo;
        document.getElementById('count-woo').textContent = counts.woo;

        const progressPercent = document.getElementById('active-site-progress');
        const progressBar = document.getElementById('active-site-progress-bar');
        
        if (progressPercent) progressPercent.textContent = percent + '%';
        if (progressBar) progressBar.style.width = percent + '%';
    },

    // --- Interaction Helpers ---

    setCategory: (cat, btn) => {
        Checklist.currentCategory = cat;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        Checklist.renderTasks();
    },

    save: () => {
        localStorage.setItem('wptoolbox_checklists_v3', JSON.stringify(Checklist.sites));
    },

    // --- Modals ---

    openAddSiteModal: () => {
        const modal = document.getElementById('site-modal');
        modal.classList.remove('hidden');
        document.getElementById('site-name-input').focus();
    },
    closeSiteModal: () => {
        document.getElementById('site-modal').classList.add('hidden');
        document.getElementById('site-name-input').value = '';
    },

    openEditModal: (taskId) => {
        Checklist.editingTaskId = taskId;
        const site = Checklist.sites.find(s => s.id === Checklist.activeSiteId);
        const task = site.items.find(i => i.id === taskId);
        
        const input = document.getElementById('edit-task-input');
        input.value = task.text[App.currentLang] || task.text['en'];
        
        document.getElementById('edit-modal').classList.remove('hidden');
        input.focus();
    },
    closeEditModal: () => {
        document.getElementById('edit-modal').classList.add('hidden');
        Checklist.editingTaskId = null;
    },
    saveEditedTask: () => {
        const text = document.getElementById('edit-task-input').value.trim();
        if (!text) return;

        const site = Checklist.sites.find(s => s.id === Checklist.activeSiteId);
        const task = site.items.find(i => i.id === Checklist.editingTaskId);
        
        if (task) {
            task.text[App.currentLang] = text;
            Checklist.save();
            Checklist.renderTasks();
        }
        Checklist.closeEditModal();
    },

    // --- Import / Export ---
    exportAll: () => {
        const data = JSON.stringify(Checklist.sites, null, 2);
        App.downloadFile(data, 'wptoolbox-checklists.json', 'application/json');
    },

    importAll: () => {
        document.getElementById('import-all-input').click();
    },

    handleImport: (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    Checklist.sites = imported;
                    Checklist.activeSiteId = Checklist.sites[0]?.id || null;
                    Checklist.save();
                    Checklist.renderSites();
                    Checklist.renderTasks();
                    Checklist.updateStats();
                    App.showToast(App.t('msg_import_success'));
                }
            } catch (err) {
                App.showToast(App.t('msg_import_fail'));
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    }
};

// Expose globally
window.Checklist = Checklist;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Checklist.init);
} else {
    Checklist.init();
}
