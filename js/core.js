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

    translatePage() {
        if (!State.translations[State.currentLang]) return;

        const langData = State.translations[State.currentLang];

        // Translate text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const translation = langData[el.dataset.i18n];
            if (translation) {
                if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
                    el.value = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Translate placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const translation = langData[el.dataset.i18nPlaceholder];
            if (translation) el.placeholder = translation;
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
        const nav = document.getElementById('global-nav');
        if (!nav) return;

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const links = State.nav;

        const isAr = State.currentLang === 'ar';

        const navHtml = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16 items-center">
                    <div class="flex items-center gap-2">
                        <div class="p-1.5 bg-zinc-900 dark:bg-zinc-800 text-white rounded-lg">
                            <i data-lucide="layout-grid" class="w-5 h-5"></i>
                        </div>
                        <a href="index.html" class="text-lg font-bold tracking-tight text-white">WPToolbox</a>
                    </div>
                    
                    <!-- Desktop Menu -->
                    <div class="hidden md:flex items-center gap-6">
                        ${links.map(link => `
                            <a href="${link.href}" class="text-sm font-medium ${currentPath === link.href ? 'text-white' : 'text-zinc-500 hover:text-white'} transition-none">${I18n.t(link.text)}</a>
                        `).join('')}
                        <div class="h-4 w-px bg-zinc-800"></div>
                        
                        <button onclick="document.getElementById('cmd-palette')?.classList.remove('hidden'); document.getElementById('cmd-search')?.focus();" class="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 hover:text-white transition-none group">
                            <i data-lucide="search" class="w-3.5 h-3.5"></i>
                            <span class="text-[10px] font-mono tracking-widest opacity-80 mt-px">CTRL+K</span>
                        </button>

                        <button onclick="App.setLanguage('${isAr ? 'en' : 'ar'}')" class="text-xs font-bold px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 hover:text-white transition-none uppercase tracking-widest">
                            ${isAr ? 'English' : 'العربية'}
                        </button>
                        <a href="https://github.com/hadealahmad/WPtoolbox" target="_blank" class="text-zinc-400 hover:text-white transition-none">
                            <i data-lucide="github" class="w-5 h-5"></i>
                        </a>
                    </div>

                    <!-- Mobile Toggle -->
                    <div class="flex md:hidden items-center gap-4">
                         <button onclick="App.setLanguage('${isAr ? 'en' : 'ar'}')" class="text-[10px] font-bold px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 uppercase tracking-widest">
                            ${isAr ? 'EN' : 'AR'}
                        </button>
                        <button id="mobile-menu-btn" class="p-2 text-zinc-400 hover:text-white transition-none">
                            <i data-lucide="menu" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Mobile Menu Dropdown -->
            <div id="mobile-menu" class="hidden md:hidden border-t border-zinc-900 bg-zinc-950/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
                <div class="px-4 py-6 space-y-4">
                    ${links.map(link => `
                        <a href="${link.href}" class="flex items-center gap-3 px-4 py-3 rounded-xl ${currentPath === link.href ? 'bg-primary/10 text-white border border-primary/20' : 'text-zinc-400 hover:bg-zinc-900'} transition-none">
                            <i data-lucide="${link.icon}" class="w-5 h-5"></i>
                            <span class="text-sm font-medium">${I18n.t(link.text)}</span>
                        </a>
                    `).join('')}
                    <div class="pt-4 border-t border-zinc-900">
                        <a href="https://github.com/hadealahmad/WPtoolbox" target="_blank" class="flex items-center gap-3 px-4 py-3 text-zinc-400">
                            <i data-lucide="github" class="w-5 h-5"></i>
                            <span class="text-sm font-medium">GitHub Repository</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
        nav.innerHTML = navHtml;

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
                        WPToolbox. ${I18n.t('footer_tagline')}
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

        const tools = State.nav.map(link => ({
            name: I18n.t(link.text),
            href: link.href,
            icon: link.icon
        }));

        const renderTools = (filter = '') => {
            const filtered = tools.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
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

    // 5.2 Expose Initialization
    async init() {
        UI.initTheme(); // Must be first to prevent light flash
        await I18n.loadData();
        I18n.updateDirection();
        UI.renderNavbar();
        UI.renderFooter();
        I18n.translatePage();
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
        UI.renderNavbar();
        UI.renderFooter();
        I18n.translatePage();

        const cmdSearch = document.getElementById('cmd-search');
        if (cmdSearch) cmdSearch.placeholder = I18n.t('palette_placeholder');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
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
