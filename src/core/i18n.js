/**
 * WPToolbox Internationalization (I18n)
 */
import { State } from './state.js';
import translations from '../data/translations.json';
import nav from '../data/nav.json';

export const I18n = {
    async loadData() {
        // Direct assignment since they are imported
        State.translations = translations;
        State.nav = nav;
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
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const pageKeyMap = {
            'qr-generator.html': 'qr_generator',
            'blocksy-palette.html': 'blocksy_palette',
            'svg-sanitizer.html': 'svg_sanitizer',
            'dummy-image-generator.html': 'dummy_image',
            'server-config-generator.html': 'server_config',
            'wp-cli-builder.html': 'wp_cli_builder'
        };
        const pageKey = pageKeyMap[currentPath] || currentPath;

        const docTitle = langData[`title_${pageKey}`];
        if (docTitle) {
            document.title = docTitle;
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.setAttribute('content', docTitle);
            const twitterTitle = document.querySelector('meta[name="twitter:title"]');
            if (twitterTitle) twitterTitle.setAttribute('content', docTitle);
        }

        const docDesc = langData[`desc_${pageKey}`];
        if (docDesc) {
            const meta = document.querySelector('meta[name="description"]');
            if (meta) meta.setAttribute('content', docDesc);
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.setAttribute('content', docDesc);
            const twitterDesc = document.querySelector('meta[name="twitter:description"]');
            if (twitterDesc) twitterDesc.setAttribute('content', docDesc);
        }

        const ogLocale = document.querySelector('meta[property="og:locale"]');
        const ogLocaleAlt = document.querySelector('meta[property="og:locale:alternate"]');
        if (State.currentLang === 'ar') {
            if (ogLocale) ogLocale.setAttribute('content', 'ar_AR');
            if (ogLocaleAlt) ogLocaleAlt.setAttribute('content', 'en_US');
        } else {
            if (ogLocale) ogLocale.setAttribute('content', 'en_US');
            if (ogLocaleAlt) ogLocaleAlt.setAttribute('content', 'ar_AR');
        }
    }
};

// Language change side effects
window.addEventListener('languageChanged', () => {
    I18n.updateDirection();
    I18n.translatePage();
});
