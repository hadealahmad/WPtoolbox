/**
 * WPToolbox Application Facade
 */
import { State } from './state.js';
import { I18n } from './i18n.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';
import { BaseTool } from './base-tool.js';
import { createIcons, icons } from 'lucide';

export const App = {
    // State accessors
    get translations() { return State.translations; },
    get currentLang() { return State.currentLang; },
    set currentLang(val) { State.currentLang = val; },

    // Tool Registry
    tools: {},
    registerTool(id, config) {
        this.tools[id] = new BaseTool(id, config);
        return this.tools[id];
    },

    // Lifecycle
    async init() {
        UI.initTheme(); // Must be first to prevent light flash
        I18n.updateDirection();
        await I18n.loadData();
        I18n.translatePage();
        I18n.initObserver(); // Watch for dynamic content
        UI.initCommandPalette();
        Utils.initServiceWorker();

        if (typeof createIcons !== 'undefined' && typeof icons !== 'undefined') {
            createIcons({ icons });
        }
    },

    // Public Methods
    setLanguage(lang) {
        State.currentLang = lang;
    },

    toggleLanguage() {
        this.setLanguage(State.currentLang === 'ar' ? 'en' : 'ar');
    },

    t: (key) => I18n.t(key),

    // UI
    showToast: (msg, duration) => UI.showToast(msg, duration),
    fireConfetti: () => UI.fireConfetti(),

    // Utilities
    escapeCSV: (val) => Utils.escapeCSV(val),
    escapeHtml: (val) => Utils.escapeHtml(val),
    htmlToMarkdown: (val) => Utils.htmlToMarkdown(val),
    downloadFile: (content, filename, type) => Utils.downloadFile(content, filename, type),
    downloadZip: (files, filename) => Utils.downloadZip(files, filename),
    copyToClipboard: (text, btnElement, feedbackText) => Utils.copyToClipboard(text, btnElement, feedbackText),

    // Internals (backward compatibility or direct access)
    translatePage: () => I18n.translatePage()
};

// Expose App globally for inline scripts and backward compatibility
window.App = App;
window.I18n = I18n;
window.UI = UI;
window.Utils = Utils;
window.State = State;
window.lucide = { createIcons, icons };
