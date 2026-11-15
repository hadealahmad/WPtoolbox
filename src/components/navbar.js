/**
 * WPToolbox Navbar Component
 */
import { State } from '../core/state.js';
import { I18n } from '../core/i18n.js';
import { App } from '../core/app.js';
import { Utils } from '../core/utils.js';
import { UI } from '../core/ui.js';
import { renderIcons } from '../core/icons.js';

const GITHUB_URL = 'https://github.com/hadealahmad/WPtoolbox';

export class WptNavbar extends HTMLElement {
    constructor() {
        super();
        this.onLanguageChange = this.render.bind(this);
        this.onDataLoaded = this.render.bind(this);
        this._cleanupListeners = [];
    }

    connectedCallback() {
        window.addEventListener('languageChanged', this.onLanguageChange);
        window.addEventListener('dataLoaded', this.onDataLoaded);
        this.render();
    }

    disconnectedCallback() {
        window.removeEventListener('languageChanged', this.onLanguageChange);
        window.removeEventListener('dataLoaded', this.onDataLoaded);
        this._teardownTransientListeners();
    }

    _teardownTransientListeners() {
        while (this._cleanupListeners.length > 0) {
            const cleanup = this._cleanupListeners.pop();
            cleanup();
        }
    }

    _addManagedListener(target, event, handler, options) {
        if (!target || typeof target.addEventListener !== 'function') return;
        target.addEventListener(event, handler, options);
        this._cleanupListeners.push(() => target.removeEventListener(event, handler, options));
    }

    _supportsHover() {
        return typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover)').matches;
    }

    _positionDropdown(trigger, panel) {
        const rect = trigger.getBoundingClientRect();
        const isRtl = document.documentElement.dir === 'rtl';
        const viewportPad = 8;
        const panelWidth = panel.offsetWidth || 288;

        let left = isRtl ? rect.right - panelWidth : rect.left;
        const maxLeft = Math.max(viewportPad, window.innerWidth - panelWidth - viewportPad);
        left = Math.min(Math.max(left, viewportPad), maxLeft);

        panel.style.top = `${Math.round(rect.bottom)}px`;
        panel.style.left = `${Math.round(left)}px`;
    }

    render() {
        if (!State.nav || State.nav.length === 0 || !State.translations?.[State.currentLang]) return;

        this._teardownTransientListeners();

        const groups = State.nav;
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const isHome = currentPath === 'index.html' || currentPath === '';

        this.className = 'sticky top-0 z-50 glass-header block';

        const dropdownEntries = [];

        const desktopGroups = groups.map((group, idx) => {
            const panelId = `wpt-nav-dropdown-${idx}`;
            const chevron = Utils.h('i', {
                attrs: { 'data-lucide': 'chevron-down' },
                class: 'w-3.5 h-3.5 transition-transform opacity-40 pointer-events-none'
            });

            const trigger = Utils.h(
                'button',
                {
                    type: 'button',
                    class: 'flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-all rounded-lg hover:bg-zinc-900/50 cursor-pointer',
                    attrs: {
                        popovertarget: panelId,
                        'aria-expanded': 'false',
                        'aria-controls': panelId
                    }
                },
                Utils.h('span', { dataset: { i18n: group.group }, text: I18n.t(group.group) }),
                chevron
            );

            const panel = Utils.h(
                'div',
                {
                    id: panelId,
                    class: 'wpt-popover fixed z-50 pt-2',
                    attrs: { popover: 'auto' }
                },
                Utils.h(
                    'div',
                    { class: 'bg-zinc-950 border border-zinc-900 shadow-2xl rounded-2xl p-1.5 backdrop-blur-3xl w-72 ring-1 ring-white/5' },
                    Utils.h(
                        'div',
                        { class: 'flex flex-col gap-0.5' },
                        group.items.map(item => {
                            const isActive = currentPath === item.href;
                            return Utils.h(
                                'a',
                                {
                                    href: item.href,
                                    attrs: isActive ? { 'aria-current': 'page' } : {},
                                    class: `group/item flex items-center gap-3.5 p-3 rounded-xl hover:bg-zinc-900 transition-all ${isActive ? 'bg-zinc-900/50 text-white' : ''}`
                                },
                                Utils.h(
                                    'div',
                                    { class: 'text-zinc-500 group-hover/item:text-primary transition-all shrink-0' },
                                    Utils.h('i', { attrs: { 'data-lucide': item.icon }, class: 'w-4.5 h-4.5' })
                                ),
                                Utils.h(
                                    'div',
                                    { class: 'min-w-0' },
                                    Utils.h('div', {
                                        class: 'text-[13.5px] font-bold text-zinc-200 group-hover/item:text-white tracking-tight leading-tight mb-0.5',
                                        dataset: { i18n: item.text },
                                        text: I18n.t(item.text)
                                    }),
                                    Utils.h('div', {
                                        class: 'text-[11px] text-zinc-500 line-clamp-1 truncate font-medium group-hover/item:text-zinc-400 transition-colors',
                                        dataset: { i18n: item.desc },
                                        text: I18n.t(item.desc) || ''
                                    })
                                )
                            );
                        })
                    )
                )
            );

            let openedByHover = false;
            let closeTimer = null;

            const cancelClose = () => {
                if (closeTimer) {
                    clearTimeout(closeTimer);
                    closeTimer = null;
                }
            };

            const scheduleHoverClose = () => {
                cancelClose();
                closeTimer = setTimeout(() => {
                    if (openedByHover && panel.matches(':popover-open')) {
                        panel.hidePopover();
                    }
                }, 120);
            };

            trigger.addEventListener('pointerenter', (e) => {
                if (e.pointerType === 'touch' || !this._supportsHover()) return;
                cancelClose();
                if (!panel.matches(':popover-open')) {
                    openedByHover = true;
                    panel.showPopover();
                }
            });

            trigger.addEventListener('pointerleave', (e) => {
                if (e.pointerType === 'touch' || !this._supportsHover()) return;
                scheduleHoverClose();
            });

            panel.addEventListener('pointerenter', (e) => {
                if (e.pointerType === 'touch' || !this._supportsHover()) return;
                cancelClose();
            });

            panel.addEventListener('pointerleave', (e) => {
                if (e.pointerType === 'touch' || !this._supportsHover()) return;
                scheduleHoverClose();
            });

            trigger.addEventListener('click', (e) => {
                if (openedByHover && panel.matches(':popover-open')) {
                    // Hover just opened the popover; convert click into pinning it open.
                    e.preventDefault();
                    openedByHover = false;
                }
            });

            panel.addEventListener('beforetoggle', (e) => {
                if (e.newState === 'open') {
                    this._positionDropdown(trigger, panel);
                }
            });

            panel.addEventListener('toggle', (e) => {
                const isOpen = e.newState === 'open';
                trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                trigger.classList.toggle('text-white', isOpen);
                trigger.classList.toggle('text-zinc-400', !isOpen);
                trigger.classList.toggle('bg-zinc-900/50', isOpen);
                chevron.classList.toggle('rotate-180', isOpen);

                if (isOpen) {
                    this._positionDropdown(trigger, panel);
                } else {
                    openedByHover = false;
                    cancelClose();
                }
            });

            this._cleanupListeners.push(cancelClose);
            dropdownEntries.push({ trigger, panel });

            return Utils.h(
                'div',
                { class: 'relative h-full flex items-center' },
                trigger,
                panel
            );
        });

        const handleOpenPalette = () => {
            if (typeof UI.openCommandPalette === 'function') {
                UI.openCommandPalette();
            } else {
                const palette = document.getElementById('cmd-palette');
                if (palette && typeof palette.showModal === 'function' && !palette.open) {
                    palette.showModal();
                    document.getElementById('cmd-search')?.focus();
                }
            }
        };

        const mobileMenuBtn = Utils.h(
            'button',
            {
                id: 'mobile-menu-btn',
                type: 'button',
                class: 'min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-zinc-400 hover:text-white relative z-50 cursor-pointer shrink-0',
                attrs: {
                    popovertarget: 'mobile-menu',
                    'aria-expanded': 'false',
                    'aria-controls': 'mobile-menu',
                    'aria-label': I18n.t('nav_menu_label')
                }
            },
            Utils.h('i', { attrs: { 'data-lucide': 'menu' }, class: 'w-6 h-6 pointer-events-none' })
        );

        const mobileMenu = Utils.h(
            'div',
            {
                id: 'mobile-menu',
                class: 'wpt-popover md:hidden fixed inset-x-0 top-16 h-[calc(100dvh-4rem)] w-full bg-zinc-950/98 backdrop-blur-3xl z-40 overflow-y-auto border-t border-zinc-900/50',
                attrs: { popover: 'auto' }
            },
            Utils.h(
                'div',
                { class: 'p-6 space-y-8' },
                Utils.h(
                    'a',
                    {
                        href: 'index.html',
                        attrs: isHome ? { 'aria-current': 'page' } : {},
                        class: 'flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-300'
                    },
                    Utils.h('i', { attrs: { 'data-lucide': 'home' }, class: 'w-4 h-4' }),
                    Utils.h('span', { class: 'text-sm font-bold', dataset: { i18n: 'nav_home' }, text: I18n.t('nav_home') })
                ),
                groups.map(group =>
                    Utils.h(
                        'div',
                        { class: 'space-y-2' },
                        Utils.h('h3', {
                            class: 'text-[9px] uppercase tracking-[0.2em] font-black text-zinc-600 px-3',
                            dataset: { i18n: group.group },
                            text: I18n.t(group.group)
                        }),
                        Utils.h(
                            'div',
                            { class: 'space-y-0.5' },
                            group.items.map(item => {
                                const isActive = currentPath === item.href;
                                return Utils.h(
                                    'a',
                                    {
                                        href: item.href,
                                        attrs: isActive ? { 'aria-current': 'page' } : {},
                                        class: `flex items-center gap-4 p-3 rounded-xl ${isActive ? 'bg-primary/10 text-white' : 'text-zinc-400 active:bg-zinc-900/50'} transition-all`
                                    },
                                    Utils.h(
                                        'div',
                                        { class: 'text-zinc-500 transition-colors shrink-0' },
                                        Utils.h('i', { attrs: { 'data-lucide': item.icon }, class: 'w-4.5 h-4.5' })
                                    ),
                                    Utils.h(
                                        'div',
                                        { class: 'min-w-0' },
                                        Utils.h('div', {
                                            class: 'text-[13px] font-bold tracking-tight text-zinc-200',
                                            dataset: { i18n: item.text },
                                            text: I18n.t(item.text)
                                        }),
                                        Utils.h('div', {
                                            class: 'text-[10px] text-zinc-500 line-clamp-1 truncate font-medium',
                                            dataset: { i18n: item.desc },
                                            text: I18n.t(item.desc) || ''
                                        })
                                    )
                                );
                            })
                        )
                    )
                ),
                Utils.h(
                    'div',
                    { class: 'pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900/50' },
                    Utils.h(
                        'a',
                        {
                            href: GITHUB_URL,
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            class: 'flex items-center gap-3 px-3 py-2 text-zinc-500 font-bold hover:text-white transition-colors'
                        },
                        Utils.h('i', { attrs: { 'data-lucide': 'github' }, class: 'w-4.5 h-4.5' }),
                        Utils.h('span', { class: 'text-[10px] uppercase tracking-widest font-black', text: 'GitHub' })
                    ),
                    Utils.h('div', { class: 'h-3 w-px bg-zinc-800' }),
                    Utils.h('button', {
                        type: 'button',
                        class: 'px-3 py-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest cursor-pointer',
                        dataset: { i18n: 'toggle_lang_full' },
                        text: I18n.t('toggle_lang_full'),
                        on: { click: () => App.toggleLanguage() }
                    })
                )
            )
        );

        let mobileOpener = null;

        mobileMenu.addEventListener('beforetoggle', (e) => {
            if (e.newState === 'open') {
                const bottom = Math.max(0, Math.round(this.getBoundingClientRect().bottom));
                mobileMenu.style.top = `${bottom}px`;
                mobileMenu.style.height = `calc(100dvh - ${bottom}px)`;
            }
        });

        mobileMenu.addEventListener('toggle', (e) => {
            const isOpen = e.newState === 'open';
            mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            mobileMenuBtn.replaceChildren(
                Utils.h('i', {
                    attrs: { 'data-lucide': isOpen ? 'x' : 'menu' },
                    class: 'w-6 h-6 pointer-events-none'
                })
            );
            renderIcons(mobileMenuBtn);

            if (isOpen) {
                mobileOpener = (document.activeElement && document.activeElement !== document.body)
                    ? document.activeElement
                    : mobileMenuBtn;
                const firstLink = mobileMenu.querySelector('a[href], button');
                if (firstLink && typeof firstLink.focus === 'function') {
                    firstLink.focus({ preventScroll: true });
                }
            } else {
                const active = document.activeElement;
                const shouldRestore = !active || active === document.body || mobileMenu.contains(active);
                const target = mobileOpener || mobileMenuBtn;
                mobileOpener = null;
                if (shouldRestore && target && typeof target.focus === 'function' && document.contains(target)) {
                    target.focus();
                }
            }
        });

        const navTree = Utils.h(
            'nav',
            { attrs: { 'aria-label': I18n.t('nav_main_label') } },
            Utils.h(
                'div',
                { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
                Utils.h(
                    'div',
                    { class: 'flex justify-between min-h-16 items-center flex-wrap gap-2 py-2 md:h-16 md:flex-nowrap md:gap-0 md:py-0' },
                    Utils.h(
                        'div',
                        { class: 'flex items-center gap-2 min-w-0 shrink' },
                        Utils.h(
                            'div',
                            { class: 'p-1.5 bg-zinc-900 border border-zinc-800 text-white rounded-lg shadow-sm shrink-0' },
                            Utils.h('i', { attrs: { 'data-lucide': 'zap' }, class: 'w-5 h-5 text-primary' })
                        ),
                        Utils.h('a', {
                            href: 'index.html',
                            class: 'text-lg font-bold tracking-tight text-white hover:opacity-80 transition-opacity truncate min-w-0',
                            text: 'WPToolbox'
                        })
                    ),
                    Utils.h(
                        'div',
                        { class: 'hidden md:flex items-center gap-1' },
                        Utils.h(
                            'a',
                            {
                                href: 'index.html',
                                attrs: isHome ? { 'aria-current': 'page' } : {},
                                class: `flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${isHome ? 'text-white bg-zinc-900/50' : 'text-zinc-400'} hover:text-white transition-all rounded-lg hover:bg-zinc-900/50`
                            },
                            Utils.h('i', { attrs: { 'data-lucide': 'home' }, class: 'w-4 h-4' }),
                            Utils.h('span', { class: 'hidden lg:inline', dataset: { i18n: 'nav_home' }, text: I18n.t('nav_home') })
                        ),
                        Utils.h('div', { class: 'h-4 w-px bg-zinc-800 mx-1' }),
                        ...desktopGroups,
                        Utils.h('div', { class: 'h-4 w-px bg-zinc-800 mx-1' }),
                        Utils.h(
                            'div',
                            { class: 'flex items-center gap-2 ms-2' },
                            Utils.h(
                                'button',
                                {
                                    type: 'button',
                                    attrs: { 'aria-label': I18n.t('nav_command_palette') },
                                    class: 'flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all group cursor-pointer',
                                    on: { click: handleOpenPalette }
                                },
                                Utils.h('i', { attrs: { 'data-lucide': 'search' }, class: 'w-4 h-4' }),
                                Utils.h('span', { class: 'hidden lg:inline text-[10px] font-mono tracking-widest opacity-60', text: 'CTRL+K' })
                            ),
                            Utils.h('button', {
                                type: 'button',
                                class: 'h-8 w-8 flex items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-white transition-all uppercase cursor-pointer',
                                dataset: { i18n: 'toggle_lang' },
                                text: I18n.t('toggle_lang'),
                                on: { click: () => App.toggleLanguage() }
                            }),
                            Utils.h(
                                'a',
                                {
                                    href: GITHUB_URL,
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                    attrs: { 'aria-label': I18n.t('nav_github_label') },
                                    class: 'h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-white transition-all'
                                },
                                Utils.h('i', { attrs: { 'data-lucide': 'github' }, class: 'w-5 h-5' })
                            )
                        )
                    ),
                    Utils.h(
                        'div',
                        { class: 'md:hidden flex items-center flex-wrap gap-2 sm:gap-3 min-w-0' },
                        Utils.h('button', {
                            type: 'button',
                            class: 'min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 uppercase cursor-pointer shrink-0 flex items-center justify-center',
                            dataset: { i18n: 'toggle_lang' },
                            text: I18n.t('toggle_lang'),
                            on: { click: () => App.toggleLanguage() }
                        }),
                        mobileMenuBtn
                    )
                )
            ),
            mobileMenu
        );

        this.replaceChildren(navTree);
        renderIcons(this);

        const closeOpenDropdowns = () => {
            dropdownEntries.forEach(({ panel }) => {
                if (panel.matches(':popover-open')) {
                    panel.hidePopover();
                }
            });
        };

        this._addManagedListener(window, 'resize', () => {
            dropdownEntries.forEach(({ trigger, panel }) => {
                if (panel.matches(':popover-open')) {
                    this._positionDropdown(trigger, panel);
                }
            });
        });

        if (typeof window.matchMedia === 'function') {
            const mdQuery = window.matchMedia('(min-width: 768px)');
            const onMediaChange = (e) => {
                if (e.matches) {
                    if (mobileMenu.matches(':popover-open')) {
                        mobileMenu.hidePopover();
                    }
                } else {
                    closeOpenDropdowns();
                }
            };
            this._addManagedListener(mdQuery, 'change', onMediaChange);
        }
    }
}

customElements.define('wpt-navbar', WptNavbar);
