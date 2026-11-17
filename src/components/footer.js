/**
 * WPToolbox Footer Component
 */
import { State } from '../core/state.js';
import { I18n } from '../core/i18n.js';
import { Utils } from '../core/utils.js';
import { renderIcons } from '../core/icons.js';

export class WptFooter extends HTMLElement {
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
        if (!State.translations?.[State.currentLang]) return;
        this.className = 'bg-zinc-950 border-t border-zinc-900 py-12 mt-20 transition-none block';

        const privacyBtn = Utils.h('button', {
            type: 'button',
            id: 'wpt-privacy-settings-btn',
            class: 'text-zinc-400 hover:text-white text-xs font-medium underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1.5 py-0.5 cursor-pointer transition-none',
            dataset: { i18n: 'consent_privacy_settings' },
            text: I18n.t('consent_privacy_settings'),
            on: {
                click: () => {
                    window.dispatchEvent(new CustomEvent('wpt:open-consent', { detail: { trigger: privacyBtn } }));
                }
            }
        });

        const backupLink = Utils.h('a', {
            href: 'backup.html',
            id: 'wpt-footer-backup-link',
            class: 'text-zinc-400 hover:text-white text-xs font-medium underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1.5 py-0.5 transition-none',
            dataset: { i18n: 'footer_backup_restore' },
            text: I18n.t('footer_backup_restore')
        });

        const content = Utils.h(
            'div',
            { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
            Utils.h(
                'div',
                { class: 'flex flex-col md:flex-row justify-between items-center gap-6' },
                Utils.h(
                    'div',
                    { class: 'flex items-center gap-2' },
                    Utils.h('i', { attrs: { 'data-lucide': 'zap' }, class: 'w-4 h-4 text-white' }),
                    Utils.h('span', { class: 'text-sm font-bold tracking-tighter uppercase text-white', text: 'WPToolbox' })
                ),
                Utils.h(
                    'p',
                    { class: 'text-zinc-400 text-xs text-center md:text-start' },
                    'WPToolbox. ',
                    Utils.h('span', { dataset: { i18n: 'footer_tagline' }, text: I18n.t('footer_tagline') })
                ),
                Utils.h(
                    'div',
                    { class: 'flex flex-wrap items-center justify-center gap-6' },
                    backupLink,
                    privacyBtn,
                    Utils.h(
                        'a',
                        {
                            href: 'https://x.com/hadealahmad',
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            attrs: { 'aria-label': I18n.t('footer_twitter_label') },
                            class: 'text-zinc-400 hover:text-white transition-none'
                        },
                        Utils.h('i', { attrs: { 'data-lucide': 'twitter' }, class: 'w-4 h-4' })
                    ),
                    Utils.h(
                        'a',
                        {
                            href: 'https://github.com/hadealahmad/WPtoolbox',
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            attrs: { 'aria-label': I18n.t('footer_github_label') },
                            class: 'text-zinc-400 hover:text-white transition-none'
                        },
                        Utils.h('i', { attrs: { 'data-lucide': 'github' }, class: 'w-4 h-4' })
                    )
                )
            )
        );

        this.replaceChildren(content);
        renderIcons(this);
    }
}

customElements.define('wpt-footer', WptFooter);
