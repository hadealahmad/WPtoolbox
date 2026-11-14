/**
 * WPToolbox Shared UI Components and logic
 */
import { State } from './state.js';
import { I18n } from './i18n.js';
import { Analytics } from './analytics.js';
import { Utils } from './utils.js';
import { createIcons, icons } from 'lucide';
import confetti from 'canvas-confetti';

const SUPPORTS_CLOSEDBY = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

let _dialogCounter = 0;

function attachBackdropDismissFallback(dialog, contentEl, onDismiss) {
    if (SUPPORTS_CLOSEDBY) return;
    let pointerStartedOutside = false;
    const isOutside = (e) => {
        const rect = contentEl.getBoundingClientRect();
        return e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
    };
    dialog.addEventListener('pointerdown', (e) => {
        pointerStartedOutside = e.target === dialog && isOutside(e);
    });
    dialog.addEventListener('pointerup', (e) => {
        if (pointerStartedOutside && e.target === dialog && isOutside(e)) {
            onDismiss();
        }
        pointerStartedOutside = false;
    });
}

function restoreFocus(opener) {
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus();
    }
}

export const UI = {
    _toastTimer: null,

    initTheme() {
        document.documentElement.classList.add('dark');
    },

    setTheme(theme) {
        const nextTheme = theme === 'light' ? 'light' : 'dark';
        const isDark = document.documentElement.classList.contains('dark');
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
        if ((nextTheme === 'dark') !== isDark) {
            Analytics.track('theme_change', { theme: nextTheme });
        }
    },

    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        this.setTheme(isDark ? 'light' : 'dark');
    },

    confirm(message, opts = {}) {
        const {
            confirmText,
            cancelText,
            danger = false
        } = opts || {};

        return new Promise((resolve) => {
            const opener = document.activeElement;
            const titleId = `wpt-dialog-title-${++_dialogCounter}`;
            const descId = `wpt-dialog-desc-${_dialogCounter}`;
            let settled = false;

            const closeWith = (val) => {
                if (dialog.open) {
                    dialog.close(val ? 'confirm' : 'cancel');
                }
            };

            const confirmBtnClass = danger
                ? 'px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer'
                : 'px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:opacity-90 text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer';

            const card = Utils.h(
                'form',
                {
                    method: 'dialog',
                    class: 'w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-start space-y-4'
                },
                Utils.h(
                    'div',
                    { class: 'flex items-start justify-between gap-4' },
                    Utils.h('h2', {
                        id: titleId,
                        class: 'text-base font-bold tracking-tight text-white',
                        text: I18n.t('dialog_confirm_title')
                    }),
                    Utils.h(
                        'button',
                        {
                            type: 'button',
                            attrs: { 'aria-label': I18n.t('dialog_close_label') },
                            class: 'p-1.5 -m-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer',
                            on: { click: () => closeWith(false) }
                        },
                        Utils.h('i', { attrs: { 'data-lucide': 'x' }, class: 'w-4 h-4 pointer-events-none' })
                    )
                ),
                Utils.h('p', {
                    id: descId,
                    class: 'text-sm text-zinc-300 leading-relaxed whitespace-pre-line',
                    text: String(message ?? '')
                }),
                Utils.h(
                    'div',
                    { class: 'flex flex-wrap items-center justify-end gap-2 pt-2' },
                    Utils.h('button', {
                        type: 'button',
                        class: 'px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer',
                        text: cancelText || I18n.t('dialog_cancel_btn'),
                        on: { click: () => closeWith(false) }
                    }),
                    Utils.h('button', {
                        type: 'submit',
                        value: 'confirm',
                        class: confirmBtnClass,
                        text: confirmText || I18n.t('dialog_confirm_btn')
                    })
                )
            );

            const dialog = Utils.h(
                'dialog',
                {
                    class: 'wpt-dialog w-[min(28rem,calc(100vw-2rem))] overscroll-contain',
                    attrs: {
                        closedby: 'any',
                        'aria-labelledby': titleId,
                        'aria-describedby': descId
                    }
                },
                card
            );

            attachBackdropDismissFallback(dialog, card, () => closeWith(false));

            dialog.addEventListener('close', () => {
                if (settled) return;
                settled = true;
                const confirmed = dialog.returnValue === 'confirm';
                dialog.returnValue = '';
                dialog.remove();
                restoreFocus(opener);
                resolve(confirmed);
            });

            document.body.appendChild(dialog);
            createIcons({ icons, root: dialog });
            dialog.showModal();
        });
    },

    prompt(message, defaultValue = '', opts = {}) {
        const { placeholder = '', confirmText, cancelText } = opts || {};
        const initialValue = defaultValue === null || defaultValue === undefined ? '' : String(defaultValue);

        return new Promise((resolve) => {
            const opener = document.activeElement;
            const titleId = `wpt-dialog-title-${++_dialogCounter}`;
            const inputId = `wpt-dialog-input-${_dialogCounter}`;
            let settled = false;

            const closeWith = (val) => {
                if (dialog.open) {
                    dialog.close(val ? 'confirm' : 'cancel');
                }
            };

            const input = Utils.h('input', {
                id: inputId,
                type: 'text',
                value: initialValue,
                placeholder: placeholder ? String(placeholder) : '',
                class: 'w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'
            });

            const card = Utils.h(
                'form',
                {
                    method: 'dialog',
                    class: 'w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-start space-y-4'
                },
                Utils.h(
                    'div',
                    { class: 'flex items-start justify-between gap-4' },
                    Utils.h('h2', {
                        id: titleId,
                        class: 'text-base font-bold tracking-tight text-white',
                        text: I18n.t('dialog_prompt_title')
                    }),
                    Utils.h(
                        'button',
                        {
                            type: 'button',
                            attrs: { 'aria-label': I18n.t('dialog_close_label') },
                            class: 'p-1.5 -m-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer',
                            on: { click: () => closeWith(false) }
                        },
                        Utils.h('i', { attrs: { 'data-lucide': 'x' }, class: 'w-4 h-4 pointer-events-none' })
                    )
                ),
                Utils.h('label', {
                    for: inputId,
                    class: 'block text-sm text-zinc-300 leading-relaxed whitespace-pre-line',
                    text: String(message ?? '')
                }),
                input,
                Utils.h(
                    'div',
                    { class: 'flex flex-wrap items-center justify-end gap-2 pt-2' },
                    Utils.h('button', {
                        type: 'button',
                        class: 'px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer',
                        text: cancelText || I18n.t('dialog_cancel_btn'),
                        on: { click: () => closeWith(false) }
                    }),
                    Utils.h('button', {
                        type: 'submit',
                        value: 'confirm',
                        class: 'px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:opacity-90 text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer',
                        text: confirmText || I18n.t('dialog_ok_btn')
                    })
                )
            );

            const dialog = Utils.h(
                'dialog',
                {
                    class: 'wpt-dialog w-[min(28rem,calc(100vw-2rem))] overscroll-contain',
                    attrs: {
                        closedby: 'any',
                        'aria-labelledby': titleId
                    }
                },
                card
            );

            attachBackdropDismissFallback(dialog, card, () => closeWith(false));

            dialog.addEventListener('close', () => {
                if (settled) return;
                settled = true;
                const confirmed = dialog.returnValue === 'confirm';
                const result = confirmed ? input.value : null;
                dialog.returnValue = '';
                dialog.remove();
                restoreFocus(opener);
                resolve(result);
            });

            document.body.appendChild(dialog);
            createIcons({ icons, root: dialog });
            dialog.showModal();
            input.focus();
            if (initialValue) input.select();
        });
    },

    initCommandPalette() {
        if (document.getElementById('cmd-palette')) return;

        const input = Utils.h('input', {
            type: 'text',
            id: 'cmd-search',
            class: 'bg-transparent border-none focus:outline-none text-white w-full text-base',
            placeholder: I18n.t('palette_placeholder')
        });

        const results = Utils.h('div', {
            id: 'cmd-results',
            class: 'max-h-[400px] overflow-y-auto p-2'
        });

        const card = Utils.h(
            'div',
            { class: 'w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden' },
            Utils.h(
                'div',
                { class: 'flex items-center gap-3 px-4 py-4 border-b border-zinc-800' },
                Utils.h('i', { attrs: { 'data-lucide': 'search' }, class: 'w-5 h-5 text-zinc-500 shrink-0' }),
                input
            ),
            results
        );

        const palette = Utils.h(
            'dialog',
            {
                id: 'cmd-palette',
                class: 'wpt-dialog w-[min(36rem,calc(100vw-2rem))] mt-[10vh] mb-auto overscroll-contain',
                attrs: {
                    closedby: 'any',
                    'aria-label': I18n.t('palette_label')
                }
            },
            card
        );

        document.body.appendChild(palette);
        createIcons({ icons, root: palette });

        let opener = null;
        let activeIndex = -1;

        const setActive = (idx) => {
            const items = results.querySelectorAll('a');
            if (!items.length) return;
            activeIndex = (idx + items.length) % items.length;
            items.forEach((el, i) => el.classList.toggle('bg-zinc-800', i === activeIndex));
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        };

        const renderTools = (filter = '') => {
            activeIndex = -1;
            const tools = (State.nav || []).flatMap(group =>
                group.items.map(item => ({
                    name: I18n.t(item.text),
                    href: item.href,
                    icon: item.icon
                }))
            );

            const q = String(filter || '').toLowerCase();
            const filtered = tools.filter(t => (t.name || '').toLowerCase().includes(q));

            if (filtered.length === 0) {
                results.replaceChildren(
                    Utils.h('p', {
                        class: 'px-3 py-6 text-center text-sm text-zinc-500',
                        text: I18n.t('palette_empty')
                    })
                );
                return;
            }

            const nodes = filtered.map((t, idx) =>
                Utils.h(
                    'a',
                    {
                        href: t.href,
                        dataset: { index: idx },
                        class: 'flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 group transition-none'
                    },
                    Utils.h(
                        'div',
                        { class: 'w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-none shrink-0' },
                        Utils.h('i', { attrs: { 'data-lucide': t.icon }, class: 'w-4 h-4' })
                    ),
                    Utils.h('span', {
                        class: 'text-sm font-medium text-zinc-300 group-hover:text-white',
                        text: t.name
                    })
                )
            );

            results.replaceChildren(...nodes);
            createIcons({ icons, attrs: { class: 'w-4 h-4' }, root: results });
        };

        const updatePalette = () => {
            palette.setAttribute('aria-label', I18n.t('palette_label'));
            input.placeholder = I18n.t('palette_placeholder');
            renderTools(input.value);
        };

        const openPalette = () => {
            if (palette.open) return;
            opener = document.activeElement;
            palette.showModal();
            input.focus();
            Analytics.track('command_palette_open');
        };

        const closePalette = () => {
            if (palette.open) {
                palette.close();
            }
        };

        this.openCommandPalette = openPalette;
        this.closeCommandPalette = closePalette;

        attachBackdropDismissFallback(palette, card, closePalette);

        palette.addEventListener('close', () => {
            palette.returnValue = '';
            input.value = '';
            renderTools('');
            const prevOpener = opener;
            opener = null;
            restoreFocus(prevOpener);
        });

        input.addEventListener('input', (e) => renderTools(e.target.value));

        window.addEventListener('languageChanged', updatePalette);
        window.addEventListener('dataLoaded', updatePalette);

        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                palette.open ? closePalette() : openPalette();
            }
        });

        palette.addEventListener('keydown', (e) => {
            const items = results.querySelectorAll('a');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive(activeIndex < 0 ? 0 : activeIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(activeIndex < 0 ? items.length - 1 : activeIndex - 1);
            } else if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                items[activeIndex].click();
            }
        });

        results.addEventListener('mousemove', (e) => {
            const link = e.target.closest('a[data-index]');
            if (link) setActive(Number(link.dataset.index));
        });

        results.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (!link) return;
            Analytics.track('command_palette_select', {
                target: link.getAttribute('href') || ''
            });
        });

        updatePalette();
    },

    showToast(msg, opts = 3000) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-msg');
        if (!toast || !toastMsg) return;

        let type = 'info';
        let duration = 3000;

        if (typeof opts === 'number' && Number.isFinite(opts)) {
            duration = opts;
        } else if (typeof opts === 'string') {
            if (opts === 'error' || opts === 'success' || opts === 'info') {
                type = opts;
            }
        } else if (opts && typeof opts === 'object') {
            if (opts.type === 'error' || opts.type === 'success' || opts.type === 'info') {
                type = opts.type;
            }
            if (typeof opts.duration === 'number' && Number.isFinite(opts.duration)) {
                duration = opts.duration;
            }
        }

        if (duration <= 0) duration = 3000;

        if (this._toastTimer) {
            clearTimeout(this._toastTimer);
            this._toastTimer = null;
        }

        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        toast.setAttribute('aria-atomic', 'true');

        const card = toast.firstElementChild;
        if (card) {
            card.classList.toggle('border-red-500/40', type === 'error');
            card.classList.toggle('border-zinc-800', type !== 'error');
        }
        const iconEl = toast.querySelector('svg, [data-lucide]');
        if (iconEl) {
            iconEl.classList.toggle('text-red-400', type === 'error');
            iconEl.classList.toggle('text-blue-400', type === 'info');
            iconEl.classList.toggle('text-green-400', type === 'success');
        }

        toastMsg.textContent = msg;

        if (toast.hasAttribute('popover') && typeof toast.showPopover === 'function') {
            toast.classList.add('wpt-popover');
            if (!toast.matches(':popover-open')) {
                toast.showPopover();
            }
        }
        toast.classList.remove('translate-y-24', 'opacity-0');

        this._toastTimer = setTimeout(() => {
            toast.classList.add('translate-y-24', 'opacity-0');
            if (toast.hasAttribute('popover') && typeof toast.hidePopover === 'function' && toast.matches(':popover-open')) {
                toast.hidePopover();
            }
            this._toastTimer = null;
        }, duration);
    },

    fireConfetti() {
        const reducedMotion = typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) return;

        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#0ad28d', '#ffffff', '#1a1a1a'],
                disableForReducedMotion: true
            });
        }
    }
};
