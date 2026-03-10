/**
 * WPToolbox Navbar Component
 */
import { State } from '../core/state.js';
import { I18n } from '../core/i18n.js';
import { App } from '../core/app.js';

export class WptNavbar extends HTMLElement {
    constructor() {
        super();
        this.onLanguageChange = this.render.bind(this);
        this.onDataLoaded = this.render.bind(this);
    }

    connectedCallback() {
        window.addEventListener('languageChanged', this.onLanguageChange);
        window.addEventListener('dataLoaded', this.onDataLoaded);
        this.render();
    }

    disconnectedCallback() {
        window.removeEventListener('languageChanged', this.onLanguageChange);
        window.removeEventListener('dataLoaded', this.onDataLoaded);
    }

    render() {
        if (!State.nav || State.nav.length === 0) return;

        const groups = State.nav;
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';

        this.className = "sticky top-0 z-50 glass-header block";
        this.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16 items-center">
                    <!-- Logo Area -->
                    <div class="flex items-center gap-2">
                        <div class="p-1.5 bg-zinc-900 border border-zinc-800 text-white rounded-lg shadow-sm">
                            <i data-lucide="zap" class="w-5 h-5 text-primary"></i>
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

        // Mobile Menu Logic
        const btn = this.querySelector('#mobile-menu-btn');
        const menu = this.querySelector('#mobile-menu');
        
        if (btn && menu) {
            btn.onclick = (e) => {
                e.stopPropagation();
                menu.classList.toggle('hidden');
                const isOpening = !menu.classList.contains('hidden');
                btn.innerHTML = `<i data-lucide="${isOpening ? 'x' : 'menu'}" class="w-6 h-6"></i>`;
                if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
            };

            // Clean up old listener if it exists to avoid accumulation
            if (this._outsideClickHandler) {
                document.removeEventListener('click', this._outsideClickHandler);
            }

            this._outsideClickHandler = (e) => {
                if (!menu.contains(e.target) && !btn.contains(e.target)) {
                    if (!menu.classList.contains('hidden')) {
                        menu.classList.add('hidden');
                        btn.innerHTML = '<i data-lucide="menu" class="w-6 h-6"></i>';
                        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
                    }
                }
            };

            document.addEventListener('click', this._outsideClickHandler);
        }

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    }
}

customElements.define('wpt-navbar', WptNavbar);
