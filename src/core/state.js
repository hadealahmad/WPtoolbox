/**
 * WPToolbox State Management (Reactive)
 */

const _state = {
    translations: {},
    nav: [],
    currentLang: localStorage.getItem('wptoolbox_lang') || 'en'
};

export const State = new Proxy(_state, {
    set(target, prop, value) {
        const oldValue = target[prop];
        target[prop] = value;
        
        if (prop === 'currentLang' && oldValue !== value) {
            localStorage.setItem('wptoolbox_lang', value);
            
            // Notify components and core systems
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: value } }));
        }
        
        if (prop === 'nav' || prop === 'translations') {
            window.dispatchEvent(new CustomEvent('dataLoaded', { detail: { prop } }));
        }

        return true;
    }
});
