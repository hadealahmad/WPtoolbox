/**
 * WPToolbox Core Utilities
 * Shared logic for all tools
 */

// -----------------------------------------------------------------------------
// 0. BASE TOOL CLASS
// -----------------------------------------------------------------------------
class BaseTool {
    constructor(id, config) {
        this.id = id;
        this.config = {
            dropZoneId: 'drop-zone',
            fileInputId: 'file-input',
            progressBarId: 'progress-bar',
            progressStatusId: 'progress-status',
            processedCountId: 'processed-count',
            overlayId: 'processing-overlay',
            cancelBtnId: 'cancel-btn',
            resultsId: 'results-section',
            multiple: false,
            ...config
        };
        this.isCancelled = false;
        this.init();
    }

    init() {
        this.dropZone = document.getElementById(this.config.dropZoneId);
        this.fileInput = document.getElementById(this.config.fileInputId);
        this.overlay = document.getElementById(this.config.overlayId);
        
        if (this.dropZone && this.fileInput) {
            this.dropZone.onclick = (e) => {
                if (e.target.closest('button') || e.target.closest('a')) return;
                this.fileInput.click();
            };
            this.fileInput.onchange = (e) => this.handleFiles(e.target.files);

            this.dropZone.ondragover = (e) => {
                e.preventDefault();
                this.dropZone.classList.add('border-primary', 'bg-primary/5');
            };
            this.dropZone.ondragleave = () => this.dropZone.classList.remove('border-primary', 'bg-primary/5');
            this.dropZone.ondrop = (e) => {
                e.preventDefault();
                this.dropZone.classList.remove('border-primary', 'bg-primary/5');
                this.handleFiles(e.dataTransfer.files);
            };
        }

        // Global language change listener
        window.addEventListener('languageChanged', () => {
            if (this.config.onLanguageChange) this.config.onLanguageChange(State.currentLang);
        });

        // Initialize Lucide icons if any were added dynamically
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async handleFiles(files) {
        if (!files || files.length === 0) return;
        this.isCancelled = false;
        
        if (this.config.resultsId) {
            const results = document.getElementById(this.config.resultsId);
            if (results) results.classList.remove('hidden');
        }

        if (this.config.multiple) {
            if (typeof this.config.onFiles === 'function') {
                await this.config.onFiles(files);
            }
        } else {
            if (typeof this.config.onFile === 'function') {
                await this.config.onFile(files[0]);
            }
        }
    }

    showOverlay(title, desc) {
        if (!this.overlay) return;
        const bar = document.getElementById(this.config.progressBarId);
        const status = document.getElementById(this.config.progressStatusId);
        const count = document.getElementById(this.config.processedCountId);
        const titleEl = this.overlay.querySelector('h3');
        const descEl = this.overlay.querySelector('p');

        if (titleEl) titleEl.textContent = title ? (App.t(title) || title) : App.t('processing_title');
        if (descEl) descEl.textContent = desc ? (App.t(desc) || desc) : App.t('processing_desc');

        this.overlay.classList.remove('hidden');
        if (bar) bar.style.width = '0%';
        if (status) status.textContent = '0%';
        if (count) count.textContent = '...';
        
        this.isCancelled = false;
    }

    hideOverlay() {
        if (this.overlay) this.overlay.classList.add('hidden');
    }

    updateProgress(percent, current, total) {
        const bar = document.getElementById(this.config.progressBarId);
        const status = document.getElementById(this.config.progressStatusId);
        const count = document.getElementById(this.config.processedCountId);

        if (bar) bar.style.width = `${percent}%`;
        if (status) status.textContent = `${percent}%`;
        if (count) count.textContent = total ? `${current} / ${total}` : `${current}`;
    }

    cancel() {
        this.isCancelled = true;
        this.hideOverlay();
        App.showToast(App.t('msg_cancelled') || "Operation cancelled");
    }

    async processInChunks(items, processFn, chunkSize = 100) {
        const total = items.length;
        const results = [];
        for (let i = 0; i < total; i += chunkSize) {
            if (this.isCancelled) return null;
            const chunk = items.slice(i, i + chunkSize);
            const chunkResults = chunk.map((item, idx) => processFn(item, i + idx));
            results.push(...chunkResults);
            const progress = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
            this.updateProgress(progress, i + chunk.length, total);
            // Yield to UI thread
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return results;
    }
}

/**
 * WPToolbox Core Utilities
 * Shared logic for all tools
 */

// -----------------------------------------------------------------------------
// 1. STATE MANAGEMENT
// -----------------------------------------------------------------------------
const State = {
    translations: {},
    nav: [],
    currentLang: localStorage.getItem('wptoolbox_lang') || 'en',

    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('wptoolbox_lang', lang);
    }
};

// -----------------------------------------------------------------------------
// 2. INTERNATIONALIZATION (I18n)
// -----------------------------------------------------------------------------
const I18n = {
    async loadData() {
        try {
            const [transRes, navRes] = await Promise.all([
                fetch('js/data/translations.json'),
                fetch('js/data/nav.json')
            ]);
            State.translations = await transRes.json();
            State.nav = await navRes.json();
        } catch (err) {
            console.error('Failed to load core data:', err);
        }
    },

    updateDirection() {
        const lang = State.currentLang;
        document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    },

    t(key) {
        return State.translations[State.currentLang]?.[key] || key;
    },

    initObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.hasAttribute('data-i18n') || node.hasAttribute('data-i18n-html') || node.hasAttribute('data-i18n-placeholder')) {
                            this.translateElement(node);
                        }
                        node.querySelectorAll('[data-i18n], [data-i18n-html], [data-i18n-placeholder]').forEach(el => this.translateElement(el));
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },

    translateElement(el) {
        const langData = State.translations[State.currentLang];
        if (!langData) return;

        // Translate text content/HTML
        const key = el.dataset.i18n || el.dataset.i18nHtml;
        const isHtml = !!el.dataset.i18nHtml;
        if (key) {
            const translation = langData[key];
            if (translation !== undefined) {
                if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
                    el.value = translation;
                } else if (isHtml) {
                    el.innerHTML = translation;
                } else {
                    el.textContent = translation;
                }
            }
        }

        // Translate placeholders
        if (el.dataset.i18nPlaceholder) {
            const translation = langData[el.dataset.i18nPlaceholder];
            if (translation !== undefined) el.placeholder = translation;
        }
    },

    translatePage() {
        if (!State.translations[State.currentLang]) return;

        const langData = State.translations[State.currentLang];

        // Translate text content & placeholders
        document.querySelectorAll('[data-i18n], [data-i18n-html], [data-i18n-placeholder]').forEach(el => {
            this.translateElement(el);
        });

        // Translate document title and meta description
        const docTitle = langData[`title_${window.location.pathname.split('/').pop() || 'index.html'}`];
        if (docTitle) document.title = docTitle;

        const docDesc = langData[`desc_${window.location.pathname.split('/').pop() || 'index.html'}`];
        if (docDesc) {
            const meta = document.querySelector('meta[name="description"]');
            if (meta) meta.setAttribute('content', docDesc);
        }
    }
};

// -----------------------------------------------------------------------------
// 3. USER INTERFACE (UI)
// -----------------------------------------------------------------------------
const UI = {
    initTheme() {
        document.documentElement.classList.add('dark');
    },

    renderNavbar() {
        const navContainer = document.getElementById('global-nav');
        if (!navContainer) return;

        const groups = State.nav;
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';

        const navHtml = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16 items-center">
                    <!-- Logo Area -->
                    <div class="flex items-center gap-2">
                        <div class="p-1.5 bg-zinc-900 border border-zinc-800 text-white rounded-lg shadow-sm">
                            <i data-lucide="layout-grid" class="w-5 h-5"></i>
                        </div>
                        <a href="index.html" class="text-lg font-bold tracking-tight text-white hover:opacity-80 transition-opacity">WPToolbox</a>
                    </div>
                    
                    <!-- Desktop Menu -->
                    <div class="hidden md:flex items-center gap-1">
                        
                        <!-- Home Link -->
                        <a href="index.html" class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${currentPath === 'index.html' || currentPath === '' ? 'text-white bg-zinc-900/50' : 'text-zinc-400'} hover:text-white transition-all rounded-lg hover:bg-zinc-900/50">
                            <i data-lucide="home" class="w-4 h-4"></i>
                            <span data-i18n="nav_home" class="hidden lg:inline">${I18n.t('nav_home')}</span>
                        </a>

                        <div class="h-4 w-px bg-zinc-800 mx-1"></div>

                        <!-- Desktop Dynamic Dropdowns -->
                        ${groups.map(group => `
                            <div class="relative group h-full flex items-center">
                                <button class="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-zinc-400 group-hover:text-white transition-all rounded-lg group-hover:bg-zinc-900/50">
                                    <span data-i18n="${group.group}">${I18n.t(group.group)}</span>
                                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 transition-transform group-hover:rotate-180 opacity-40"></i>
                                </button>

                                <!-- Dropdown Menu -->
                                <div class="absolute top-full start-0 pt-2 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50">
                                    <div class="bg-zinc-950 border border-zinc-900 shadow-2xl rounded-2xl p-1.5 backdrop-blur-3xl w-72 ring-1 ring-white/5">
                                        <div class="flex flex-col gap-0.5">
                                            ${group.items.map(item => `
                                                <a href="${item.href}" class="group/item flex items-center gap-3.5 p-3 rounded-xl hover:bg-zinc-900 transition-all ${currentPath === item.href ? 'bg-zinc-900/50 text-white' : ''}">
                                                    <div class="text-zinc-500 group-hover/item:text-primary transition-all flex-shrink-0">
                                                        <i data-lucide="${item.icon}" class="w-4.5 h-4.5"></i>
                                                    </div>
                                                    <div class="min-w-0">
                                                        <div class="text-[13.5px] font-bold text-zinc-200 group-hover/item:text-white tracking-tight leading-tight mb-0.5" data-i18n="${item.text}">${I18n.t(item.text)}</div>
                                                        <div class="text-[11px] text-zinc-500 line-clamp-1 truncate font-medium group-hover/item:text-zinc-400 transition-colors" data-i18n="${item.desc}">${I18n.t(item.desc) || ''}</div>
                                                    </div>
                                                </a>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}

                        <div class="h-4 w-px bg-zinc-800 mx-1"></div>
                        
                        <div class="flex items-center gap-2 ms-2">
                            <button onclick="document.getElementById('cmd-palette')?.classList.remove('hidden'); document.getElementById('cmd-search')?.focus();" class="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all group">
                                <i data-lucide="search" class="w-4 h-4"></i>
                                <span class="text-[10px] font-mono tracking-widest opacity-60">CTRL+K</span>
                            </button>

                            <button onclick="App.toggleLanguage()" class="h-8 w-8 flex items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-white transition-all uppercase" data-i18n="toggle_lang">
                                ${I18n.t('toggle_lang')}
                            </button>
                            
                            <a href="https://github.com/hadealahmad/WPtoolbox" target="_blank" class="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                                <i data-lucide="github" class="w-5 h-5"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Mobile Menu Button -->
                    <div class="md:hidden flex items-center gap-3">
                        <button onclick="App.toggleLanguage()" class="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 uppercase" data-i18n="toggle_lang">
                            ${I18n.t('toggle_lang')}
                        </button>
                        <button id="mobile-menu-btn" class="p-2 text-zinc-400 hover:text-white">
                            <i data-lucide="menu" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Mobile Menu Dropdown -->
            <div id="mobile-menu" class="hidden md:hidden fixed inset-x-0 top-16 bottom-0 bg-zinc-950/98 backdrop-blur-3xl z-40 overflow-y-auto border-t border-zinc-900/50">
                <div class="p-6 space-y-8">
                    <a href="index.html" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-300">
                        <i data-lucide="home" class="w-4 h-4"></i>
                        <span class="text-sm font-bold" data-i18n="nav_home">${I18n.t('nav_home')}</span>
                    </a>

                    ${groups.map(group => `
                        <div class="space-y-2">
                            <h3 class="text-[9px] uppercase tracking-[0.2em] font-black text-zinc-600 px-3" data-i18n="${group.group}">${I18n.t(group.group)}</h3>
                            <div class="space-y-0.5">
                                ${group.items.map(item => `
                                    <a href="${item.href}" class="flex items-center gap-4 p-3 rounded-xl ${currentPath === item.href ? 'bg-primary/10 text-white' : 'text-zinc-400 active:bg-zinc-900/50'} transition-all">
                                        <div class="text-zinc-500 group-active:text-primary transition-colors flex-shrink-0">
                                            <i data-lucide="${item.icon}" class="w-4.5 h-4.5"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="text-[13px] font-bold tracking-tight text-zinc-200" data-i18n="${item.text}">${I18n.t(item.text)}</div>
                                            <div class="text-[10px] text-zinc-500 line-clamp-1 truncate font-medium" data-i18n="${item.desc}">${I18n.t(item.desc) || ''}</div>
                                        </div>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}

                    <div class="pt-4 flex items-center justify-between border-t border-zinc-900/50">
                        <a href="https://github.com/hadealahmad/WPtoolbox" target="_blank" class="flex items-center gap-3 px-3 py-2 text-zinc-500 font-bold hover:text-white transition-colors">
                            <i data-lucide="github" class="w-4.5 h-4.5"></i>
                            <span class="text-[10px] uppercase tracking-widest font-black">GitHub</span>
                        </a>
                        <div class="h-3 w-px bg-zinc-800"></div>
                        <button onclick="App.toggleLanguage()" class="px-3 py-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest" data-i18n="toggle_lang_full">
                            ${I18n.t('toggle_lang_full')}
                        </button>
                    </div>
                </div>
            </div>
        `;

        navContainer.innerHTML = navHtml;

        // Mobile Menu Logic
        const btn = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('mobile-menu');
        if (btn && menu) {
            btn.onclick = (e) => {
                e.stopPropagation();
                menu.classList.toggle('hidden');
                const icon = btn.querySelector('i');
                if (icon) {
                    const isOpening = !menu.classList.contains('hidden');
                    icon.setAttribute('data-lucide', isOpening ? 'x' : 'menu');
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            };

            // Close menu on click outside
            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target) && e.target !== btn) {
                    menu.classList.add('hidden');
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.setAttribute('data-lucide', 'menu');
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }
                }
            });
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    renderFooter() {
        const footer = document.getElementById('global-footer');
        if (!footer) return;

        footer.className = "bg-zinc-950 border-t border-zinc-900 py-12 mt-20 transition-none";
        footer.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div class="flex items-center gap-2">
                        <i data-lucide="zap" class="w-4 h-4 text-white"></i>
                        <span class="text-sm font-bold tracking-tighter uppercase text-white">WPToolbox</span>
                    </div>
                    <p class="text-zinc-400 text-xs text-center md:text-start">
                        WPToolbox. <span data-i18n="footer_tagline">${I18n.t('footer_tagline')}</span>
                    </p>
                    <div class="flex items-center gap-6">
                        <a href="https://x.com/hadealahmad" target="_blank" class="text-zinc-400 hover:text-white transition-none"><i data-lucide="twitter" class="w-4 h-4"></i></a>
                        <a href="https://github.com/hadealahmad/WPtoolbox" target="_blank" class="text-zinc-400 hover:text-white transition-none"><i data-lucide="github" class="w-4 h-4"></i></a>
                    </div>
                </div>
            </div>
        `;
    },

    initCommandPalette() {
        const palette = document.createElement('div');
        palette.id = 'cmd-palette';
        palette.className = 'fixed inset-0 z-[100] hidden flex items-start justify-center pt-[10vh] px-4 bg-zinc-950/80 backdrop-blur-sm';
        palette.innerHTML = `
            <div class="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div class="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
                    <i data-lucide="search" class="w-5 h-5 text-zinc-500"></i>
                    <input type="text" id="cmd-search" class="bg-transparent border-none focus:outline-none text-white w-full text-base" 
                        placeholder="${I18n.t('palette_placeholder')}">
                </div>
                <div id="cmd-results" class="max-h-[400px] overflow-y-auto p-2"></div>
            </div>
        `;
        document.body.appendChild(palette);

        const input = palette.querySelector('#cmd-search');
        const results = palette.querySelector('#cmd-results');

        const tools = State.nav.flatMap(group => 
            group.items.map(item => ({
                name: I18n.t(item.text),
                href: item.href,
                icon: item.icon
            }))
        );

        const renderTools = (filter = '') => {
            const filtered = tools.filter(t => (t.name || '').toLowerCase().includes((filter || '').toLowerCase()));
            results.innerHTML = filtered.map((t, idx) => `
                <a href="${t.href}" class="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 group transition-none">
                    <div class="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-none">
                        <i data-lucide="${t.icon}" class="w-4 h-4"></i>
                    </div>
                    <span class="text-sm font-medium text-zinc-300 group-hover:text-white">${t.name}</span>
                </a>
            `).join('');
            if (typeof lucide !== 'undefined') lucide.createIcons({ props: { class: 'w-4 h-4' }, container: results });
        };

        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                palette.classList.toggle('hidden');
                if (!palette.classList.contains('hidden')) input.focus();
            }
            if (e.key === 'Escape') palette.classList.add('hidden');
        });

        palette.onclick = (e) => { if (e.target === palette) palette.classList.add('hidden'); };
        input.oninput = (e) => renderTools(e.target.value);
        renderTools();
    },

    showToast(msg, duration = 3000) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-msg');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = msg;
        toast.classList.remove('translate-y-24', 'opacity-0');

        setTimeout(() => {
            toast.classList.add('translate-y-24', 'opacity-0');
        }, duration);
    },

    fireConfetti() {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#0ad28d', '#ffffff', '#1a1a1a']
            });
        }
    }
};

// -----------------------------------------------------------------------------
// 4. UTILITIES (Utils)
// -----------------------------------------------------------------------------
const Utils = {
    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(err => {
                console.warn('SW registration failed:', err);
            });
        }
    },

    escapeCSV(val) {
        if (val === null || val === undefined) return '""';
        let s = String(val).replace(/\r/g, '').replace(/\n/g, ' ');
        if (/[",\n\r]/.test(s)) {
            s = `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    },

    downloadFile(content, filename, type = 'text/plain;charset=utf-8') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async copyToClipboard(text, btnElement, feedbackText) {
        const cleanText = String(text || "").trim();
        if (!cleanText) return;

        const performFeedback = () => {
            const originalText = btnElement.innerHTML;
            btnElement.innerHTML = feedbackText || (I18n.t('copy_btn') + "!");
            UI.showToast(I18n.t('copy_btn') + " " + I18n.t('to_clipboard'));
            UI.fireConfetti();
            setTimeout(() => {
                btnElement.innerHTML = originalText;
            }, 2000);
        };

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(cleanText);
                performFeedback();
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = cleanText;
                textArea.style.position = "fixed";
                textArea.style.insetInlineStart = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    performFeedback();
                } else {
                    throw new Error('ExecCommand failed');
                }
            } catch (fallbackErr) {
                UI.showToast("Failed to copy", 2000);
            }
        }
    }
};

// -----------------------------------------------------------------------------
// 5. APPLICATION FACADE (App)
// -----------------------------------------------------------------------------
const App = {
    // 5.1 Expose variables
    get translations() { return State.translations; },
    set translations(val) { State.translations = val; },

    get currentLang() { return State.currentLang; },
    set currentLang(val) { State.currentLang = val; },

    // 5.2 Tool Registry
    tools: {},
    registerTool(id, config) {
        this.tools[id] = new BaseTool(id, config);
        return this.tools[id];
    },

    // 5.3 Expose Initialization
    async init() {
        UI.initTheme(); // Must be first to prevent light flash
        await I18n.loadData();
        I18n.updateDirection();
        UI.renderNavbar();
        UI.renderFooter();
        I18n.translatePage();
        I18n.initObserver(); // Watch for dynamic content
        UI.initCommandPalette();
        Utils.initServiceWorker();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // 5.3 Expose Public Methods
    setLanguage(lang) {
        State.setLanguage(lang);
        I18n.updateDirection();
        I18n.translatePage();

        const cmdSearch = document.getElementById('cmd-search');
        if (cmdSearch) cmdSearch.placeholder = I18n.t('palette_placeholder');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    },

    toggleLanguage() {
        const nextLang = State.currentLang === 'ar' ? 'en' : 'ar';
        this.setLanguage(nextLang);
    },

    t: (key) => I18n.t(key),

    // UI
    showToast: (msg, duration) => UI.showToast(msg, duration),
    fireConfetti: () => UI.fireConfetti(),

    // Tools
    escapeCSV: (val) => Utils.escapeCSV(val),
    downloadFile: (content, filename, type) => Utils.downloadFile(content, filename, type),
    copyToClipboard: (text, btnElement, feedbackText) => Utils.copyToClipboard(text, btnElement, feedbackText),

    // Internals
    initTheme: () => UI.initTheme(),
    loadData: () => I18n.loadData(),
    updateDirection: () => I18n.updateDirection(),
    renderNavbar: () => UI.renderNavbar(),
    renderFooter: () => UI.renderFooter(),
    translatePage: () => I18n.translatePage(),
    initCommandPalette: () => UI.initCommandPalette(),
    initServiceWorker: () => Utils.initServiceWorker()
};

// Auto-init on load
document.addEventListener('DOMContentLoaded', App.init);
