/**
 * WPToolbox Application Facade
 */
import { State } from './state.js';
import { I18n } from './i18n.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';
import { BaseTool } from './base-tool.js';
import { Analytics } from './analytics.js';
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
        Analytics.setToolId(id);
        Analytics.track('tool_view', { tool_id: id });
        return this.tools[id];
    },

    isReady: false,

    // Lifecycle
    async init() {
        if (this.isReady) return;
        Analytics.init();
        UI.initTheme(); // Must be first to prevent light flash
        I18n.updateDirection();
        await I18n.loadData();
        I18n.translatePage();
        I18n.initObserver(); // Watch for dynamic content
        UI.initCommandPalette();

        if (typeof createIcons !== 'undefined' && typeof icons !== 'undefined') {
            createIcons({ icons });
        }

        // Signal all tools that translations are ready
        this.isReady = true;
        window.dispatchEvent(new Event('appReady'));
    },

    // Public Methods
    setLanguage(lang) {
        State.currentLang = lang;
    },

    toggleLanguage() {
        this.setLanguage(State.currentLang === 'ar' ? 'en' : 'ar');
    },

    t: (key) => I18n.t(key),

    // Analytics & Consent
    track: (eventName, params) => Analytics.track(eventName, params),
    setConsent: (level) => Analytics.setConsent(level),
    getConsent: () => Analytics.getConsent(),

    // UI
    showToast: (msg, opts) => UI.showToast(msg, opts),
    confirm: (message, opts) => UI.confirm(message, opts),
    prompt: (message, defaultValue, opts) => UI.prompt(message, defaultValue, opts),
    fireConfetti: () => {
        Analytics.track('tool_success', { tool_id: Analytics.getToolId() });
        UI.fireConfetti();
    },

    // Utilities
    yieldToMain: () => Utils.yieldToMain(),
    createYielder: (budgetMs) => Utils.createYielder(budgetMs),
    h: (tag, props, ...children) => Utils.h(tag, props, ...children),
    escapeCSV: (val) => Utils.escapeCSV(val),
    escapeHtml: (val) => Utils.escapeHtml(val),
    htmlToMarkdown: (val) => Utils.htmlToMarkdown(val),
    formatSize: (bytes) => Utils.formatSize(bytes),
    downloadFile: (content, filename, type) => {
        const safeName = filename ? String(filename) : '';
        const dotIdx = safeName.lastIndexOf('.');
        const fileExtension = dotIdx > 0 && dotIdx < safeName.length - 1
            ? safeName.slice(dotIdx + 1).toLowerCase()
            : '';
        const mimeType = String(type || 'text/plain;charset=utf-8').split(';')[0].trim();

        Analytics.track('file_download', {
            tool_id: Analytics.getToolId(),
            file_extension: fileExtension,
            mime_type: mimeType
        });

        return Utils.downloadFile(content, filename, type);
    },
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
window.Analytics = Analytics;
window.lucide = { createIcons, icons };
