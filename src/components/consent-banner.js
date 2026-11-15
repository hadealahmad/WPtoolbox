/**
 * WPToolbox Consent Banner Component (<wpt-consent>)
 */
import { State } from '../core/state.js';
import { I18n } from '../core/i18n.js';
import { Consent } from '../core/consent.js';
import { Utils } from '../core/utils.js';
import { renderIcons } from '../core/icons.js';

export class WptConsent extends HTMLElement {
    constructor() {
        super();
        this._isOpen = false;
        this._forceOpen = false;
        this.onLanguageChange = this.render.bind(this);
        this.onDataLoaded = this.syncVisibility.bind(this);
        this.onAppReady = this.syncVisibility.bind(this);
        this.onOpenRequest = (e) => this.open(e?.detail?.trigger);
        this.onKeyDown = (e) => {
            if (e.key === 'Escape' && this._isOpen && Consent.getConsent() !== null) {
                this.close();
            }
        };
    }

    connectedCallback() {
        window.addEventListener('languageChanged', this.onLanguageChange);
        window.addEventListener('dataLoaded', this.onDataLoaded);
        window.addEventListener('appReady', this.onAppReady);
        window.addEventListener('wpt:open-consent', this.onOpenRequest);
        document.addEventListener('keydown', this.onKeyDown);
        this.syncVisibility();
    }

    disconnectedCallback() {
        window.removeEventListener('languageChanged', this.onLanguageChange);
        window.removeEventListener('dataLoaded', this.onDataLoaded);
        window.removeEventListener('appReady', this.onAppReady);
        window.removeEventListener('wpt:open-consent', this.onOpenRequest);
        document.removeEventListener('keydown', this.onKeyDown);
    }

    open(triggerEl = null) {
        this._returnFocusEl = triggerEl || document.activeElement;
        this._forceOpen = true;
        this._isOpen = true;
        this.render();
        const region = this.querySelector('[role="region"]');
        const firstBtn = this.querySelector('button[data-consent-level]');
        if (firstBtn && typeof firstBtn.focus === 'function') {
            firstBtn.focus();
        } else if (region && typeof region.focus === 'function') {
            region.focus();
        }
    }

    close() {
        this._forceOpen = false;
        this._isOpen = false;
        this.replaceChildren();
        this.className = 'hidden';
        if (this._returnFocusEl && typeof this._returnFocusEl.focus === 'function' && document.contains(this._returnFocusEl)) {
            this._returnFocusEl.focus();
            this._returnFocusEl = null;
        }
    }

    syncVisibility() {
        const stored = Consent.getConsent();
        if (this._forceOpen || stored === null) {
            this._isOpen = true;
            this.render();
        } else {
            this._isOpen = false;
            this.replaceChildren();
            this.className = 'hidden';
        }
    }

    handleChoice(level) {
        Consent.setConsent(level);
        this.close();
    }

    render() {
        if (!this._isOpen) {
            this.replaceChildren();
            this.className = 'hidden';
            return;
        }

        const langData = State.translations && State.translations[State.currentLang];
        if (!langData) return;

        const stored = Consent.getConsent();
        const title = I18n.t('consent_title');
        const desc = I18n.t('consent_desc');
        const acceptAllLabel = I18n.t('consent_accept_all');
        const analyticsOnlyLabel = I18n.t('consent_analytics_only');
        const rejectLabel = I18n.t('consent_reject');

        const baseBtnClass = [
            'inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold',
            'border border-zinc-300 dark:border-zinc-700',
            'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
            'hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-primary/60',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900',
            'cursor-pointer sm:whitespace-nowrap text-center'
        ].join(' ');

        const btnClassFor = (level) => {
            if (stored === level) {
                return `${baseBtnClass} ring-1 ring-primary border-primary`;
            }
            return baseBtnClass;
        };

        const makeChoiceBtn = (level, i18nKey, label) =>
            Utils.h('button', {
                type: 'button',
                dataset: { consentLevel: level, i18n: i18nKey },
                attrs: { 'aria-pressed': stored === level ? 'true' : 'false' },
                class: btnClassFor(level),
                text: label,
                on: { click: () => this.handleChoice(level) }
            });

        const closeBtn = stored !== null
            ? Utils.h(
                'button',
                {
                    type: 'button',
                    dataset: { consentClose: '' },
                    attrs: { 'aria-label': I18n.t('dialog_close_label') },
                    class: 'absolute top-3 end-3 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer',
                    on: { click: () => this.close() }
                },
                Utils.h('i', { attrs: { 'data-lucide': 'x' }, class: 'w-4 h-4 pointer-events-none' })
            )
            : null;

        this.className = 'fixed bottom-4 inset-x-4 z-50 mx-auto max-w-4xl pointer-events-none block';

        const banner = Utils.h(
            'div',
            {
                attrs: { role: 'region', 'aria-label': title },
                class: 'wpt-consent-enter pointer-events-auto relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 sm:p-5 text-start max-h-[70dvh] md:max-h-none overflow-y-auto'
            },
            closeBtn,
            Utils.h(
                'div',
                { class: 'flex flex-col lg:flex-row lg:items-center justify-between gap-4' },
                Utils.h(
                    'div',
                    { class: `flex items-start gap-3 ${stored !== null ? 'pe-8 lg:pe-0' : ''}` },
                    Utils.h(
                        'div',
                        { class: 'w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center text-primary shrink-0 mt-0.5' },
                        Utils.h('i', { attrs: { 'data-lucide': 'shield-check' }, class: 'w-4.5 h-4.5' })
                    ),
                    Utils.h(
                        'div',
                        { class: 'space-y-1' },
                        Utils.h('h2', {
                            class: 'text-sm font-bold tracking-tight text-zinc-900 dark:text-white',
                            dataset: { i18n: 'consent_title' },
                            text: title
                        }),
                        Utils.h('p', {
                            class: 'text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl',
                            dataset: { i18n: 'consent_desc' },
                            text: desc
                        })
                    )
                ),
                Utils.h(
                    'div',
                    { class: 'grid grid-cols-1 sm:grid-cols-3 lg:flex lg:items-center gap-2 shrink-0' },
                    makeChoiceBtn('all', 'consent_accept_all', acceptAllLabel),
                    makeChoiceBtn('granted', 'consent_analytics_only', analyticsOnlyLabel),
                    makeChoiceBtn('denied', 'consent_reject', rejectLabel)
                )
            )
        );

        this.replaceChildren(banner);
        renderIcons(this);
    }
}

customElements.define('wpt-consent', WptConsent);
