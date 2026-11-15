/**
 * WPToolbox Utility Functions
 */
import { UI } from './ui.js';
import { I18n } from './i18n.js';

const _copyFeedbackState = new WeakMap();

const _appendChildren = (parent, items) => {
    for (const child of items) {
        if (child === null || child === undefined || typeof child === 'boolean') continue;
        if (Array.isArray(child)) {
            _appendChildren(parent, child);
        } else if (child instanceof Node) {
            parent.appendChild(child);
        } else {
            parent.appendChild(document.createTextNode(String(child)));
        }
    }
};

export const Utils = {
    yieldToMain() {
        if (typeof globalThis.scheduler?.yield === 'function') {
            return globalThis.scheduler.yield();
        }
        return new Promise(resolve => setTimeout(resolve, 0));
    },

    createYielder(budgetMs = 50) {
        const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now());
        let lastYield = now();
        return async () => {
            if (now() - lastYield >= budgetMs) {
                await Utils.yieldToMain();
                lastYield = now();
            }
        };
    },

    h(tag, props = {}, ...children) {
        const el = document.createElement(tag);
        const safeProps = props && typeof props === 'object' ? props : {};

        for (const [key, value] of Object.entries(safeProps)) {
            if (value === null || value === undefined) continue;

            if (key === 'class' || key === 'className') {
                el.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value);
            } else if (key === 'text') {
                el.textContent = String(value);
            } else if (key === 'dataset' && typeof value === 'object') {
                for (const [dataKey, dataVal] of Object.entries(value)) {
                    if (dataVal !== null && dataVal !== undefined && dataVal !== false) {
                        el.dataset[dataKey] = String(dataVal);
                    }
                }
            } else if (key === 'attrs' && typeof value === 'object') {
                for (const [attrKey, attrVal] of Object.entries(value)) {
                    if (attrVal === null || attrVal === undefined || attrVal === false) continue;
                    if (attrVal === true) {
                        el.setAttribute(attrKey, attrKey.startsWith('aria-') ? 'true' : '');
                    } else {
                        el.setAttribute(attrKey, String(attrVal));
                    }
                }
            } else if (key === 'on' && typeof value === 'object') {
                for (const [eventName, handler] of Object.entries(value)) {
                    if (typeof handler === 'function') {
                        el.addEventListener(eventName, handler);
                    }
                }
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(el.style, value);
            } else if (key === 'innerHTML' || key === 'outerHTML') {
                // Intentionally ignored for XSS safety
                continue;
            } else if (value !== false) {
                if (value === true) {
                    el.setAttribute(key, key.startsWith('aria-') ? 'true' : '');
                } else {
                    el.setAttribute(key, String(value));
                }
                if (key === 'value' && 'value' in el) {
                    el.value = String(value);
                }
            }
        }

        _appendChildren(el, children);
        return el;
    },

    isArabic(text) {
        return /^[\s\W\d]*[\u0600-\u06FF]/.test(String(text || ''));
    },

    escapeCSV(val) {
        if (val === null || val === undefined) return '';
        let s = String(val).replace(/\r/g, '').replace(/\n/g, ' ');
        if (/[",\n\r]/.test(s)) {
            s = `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    },

    escapeHtml(unsafe) {
        if (!unsafe) return "";
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    htmlToMarkdown(html) {
        if (!html) return '';
        let md = String(html)
            .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (m, level, c) => `\n\n${'#'.repeat(Number(level))} ${c}\n\n`)
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n')
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
            .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '\n$1\n')
            .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '\n$1\n')
            .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n* $1')
            .replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![image]($1)')
            .replace(/<br[^>]*>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
        return md;
    },

    downloadFile(content, filename, type = 'text/plain;charset=utf-8') {
        let url;
        let isBlob = false;

        if (typeof content === 'string' && content.startsWith('data:')) {
            url = content;
        } else {
            const blob = content instanceof Blob ? content : new Blob([content], { type });
            url = URL.createObjectURL(blob);
            isBlob = true;
        }

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (isBlob) {
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    },

    async downloadZip(files, zipFilename = 'download.zip') {
        try {
            const mod = await import('jszip');
            const JSZip = mod.default || mod;
            const zip = new JSZip();
            files.forEach(file => {
                zip.file(file.name, file.content || file.blob);
            });
            const content = await zip.generateAsync({ type: 'blob' });
            this.downloadFile(content, zipFilename, 'application/zip');
            UI.fireConfetti();
        } catch (err) {
            console.error('Error creating ZIP:', err);
            const notify = window.App?.showToast ? window.App.showToast.bind(window.App) : UI.showToast.bind(UI);
            notify(I18n.t('msg_zip_failed') || 'Failed to generate ZIP.', { type: 'error' });
        }
    },

    async copyToClipboard(text, btnElement, feedbackText) {
        const cleanText = String(text || "").trim();
        if (!cleanText) return;

        const performFeedback = () => {
            if (btnElement) {
                let state = _copyFeedbackState.get(btnElement);
                if (!state) {
                    state = { nodes: Array.from(btnElement.childNodes), timer: null };
                    _copyFeedbackState.set(btnElement, state);
                } else if (state.timer) {
                    clearTimeout(state.timer);
                }

                btnElement.textContent = feedbackText || (I18n.t('copy_btn') + "!");
                state.timer = setTimeout(() => {
                    btnElement.replaceChildren(...state.nodes);
                    _copyFeedbackState.delete(btnElement);
                }, 2000);
            }
            UI.showToast(I18n.t('copy_btn') + " " + I18n.t('to_clipboard'), { type: 'success' });
            UI.fireConfetti();
        };

        const legacyCopy = () => {
            const textArea = document.createElement("textarea");
            textArea.value = cleanText;
            textArea.setAttribute("readonly", "");
            textArea.style.position = "fixed";
            textArea.style.insetInlineStart = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            let successful = false;
            try {
                successful = document.execCommand('copy');
            } catch (e) {
                successful = false;
            }
            document.body.removeChild(textArea);
            return successful;
        };

        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(cleanText);
                performFeedback();
                return;
            } catch (err) {
                UI.showToast(I18n.t('msg_copy_failed') || "Failed to copy", { type: 'error', duration: 2000 });
                return;
            }
        }

        if (legacyCopy()) {
            performFeedback();
        } else {
            UI.showToast(I18n.t('msg_copy_failed') || "Failed to copy", { type: 'error', duration: 2000 });
        }
    },

    formatSize(bytes) {
        if (typeof bytes !== 'number' || !isFinite(bytes) || bytes < 0) return '';
        if (bytes === 0) return '0 ' + I18n.t('unit_bytes');
        const k = 1024;
        const sizes = [
            I18n.t('unit_bytes'),
            I18n.t('unit_kb'),
            I18n.t('unit_mb'),
            I18n.t('unit_gb')
        ];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};
