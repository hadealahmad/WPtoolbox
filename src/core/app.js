/**
 * WPToolbox Application Facade
 */
import { State } from './state.js';
import { I18n } from './i18n.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';
import { BaseTool } from './base-tool.js';
import { Consent } from './consent.js';
import { Backup, BACKUP_FLASH_KEY } from './backup.js';
import { createIcons, icons, renderIcons } from './icons.js';

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

    isReady: false,
    _initPromise: null,

    // Lifecycle
    init() {
        if (this.isReady) return Promise.resolve();
        if (this._initPromise) return this._initPromise;

        this._initPromise = (async () => {
            UI.initTheme(); // Must be first to prevent light flash
            I18n.updateDirection();
            await I18n.loadData();
            I18n.translatePage();
            I18n.initObserver(); // Watch for dynamic content
            UI.initCommandPalette();

            renderIcons();

            // Surface any post-reload backup restore notification
            try {
                const rawFlash = sessionStorage.getItem(BACKUP_FLASH_KEY);
                if (rawFlash) {
                    sessionStorage.removeItem(BACKUP_FLASH_KEY);
                    const flash = JSON.parse(rawFlash);
                    if (flash?.message) {
                        UI.showToast(flash.message, { type: flash.type || 'success' });
                    }
                }
            } catch {
                // Ignore sessionStorage errors
            }

            // Signal all tools that translations are ready
            this.isReady = true;
            window.dispatchEvent(new Event('appReady'));
        })();

        return this._initPromise;
    },

    // Public Methods
    setLanguage(lang) {
        State.currentLang = lang;
    },

    toggleLanguage() {
        this.setLanguage(State.currentLang === 'ar' ? 'en' : 'ar');
    },

    t: (key) => I18n.t(key),

    // Consent
    setConsent: (level) => Consent.setConsent(level),
    getConsent: () => Consent.getConsent(),

    // Backup & Restore
    exportBackup: (opts) => Backup.exportBackup(opts),
    importBackup: (fileOrObject, opts) => Backup.importBackup(fileOrObject, opts),

    // UI
    showToast: (msg, opts) => UI.showToast(msg, opts),
    confirm: (message, opts) => UI.confirm(message, opts),
    prompt: (message, defaultValue, opts) => UI.prompt(message, defaultValue, opts),
    fireConfetti: () => UI.fireConfetti(),

    // Utilities
    yieldToMain: () => Utils.yieldToMain(),
    createYielder: (budgetMs) => Utils.createYielder(budgetMs),
    h: (tag, props, ...children) => Utils.h(tag, props, ...children),
    escapeCSV: (val) => Utils.escapeCSV(val),
    escapeHtml: (val) => Utils.escapeHtml(val),
    htmlToMarkdown: (val) => Utils.htmlToMarkdown(val),
    formatSize: (bytes) => Utils.formatSize(bytes),
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
