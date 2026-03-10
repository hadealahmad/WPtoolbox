/**
 * WPToolbox Utility Functions
 */
import { UI } from './ui.js';
import { I18n } from './i18n.js';
import JSZip from 'jszip';

export const Utils = {
    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(err => {
                console.warn('SW registration failed:', err);
            });
        }
    },

    escapeCSV(val) {
        if (val === null || val === undefined) return '""';
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
            .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (m, c) => `\n\n# ${c}\n\n`)
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
        const blob = content instanceof Blob ? content : new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async downloadZip(files, zipFilename = 'download.zip') {
        if (typeof JSZip === 'undefined') {
            UI.showToast("JSZip not loaded");
            return;
        }
        const zip = new JSZip();
        files.forEach(file => {
            zip.file(file.name, file.content || file.blob);
        });
        const content = await zip.generateAsync({ type: 'blob' });
        this.downloadFile(content, zipFilename, 'application/zip');
        UI.fireConfetti();
    },

    async copyToClipboard(text, btnElement, feedbackText) {
        const cleanText = String(text || "").trim();
        if (!cleanText) return;

        const performFeedback = () => {
            const originalText = btnElement.innerHTML;
            btnElement.innerHTML = feedbackText || (I18n.t('copy_btn') + "!");
            UI.showToast(I18n.t('copy_btn') + " " + I18n.t('to_clipboard'));
            UI.fireConfetti();
            setTimeout(() => {
                btnElement.innerHTML = originalText;
            }, 2000);
        };

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(cleanText);
                performFeedback();
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = cleanText;
                textArea.style.position = "fixed";
                textArea.style.insetInlineStart = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    performFeedback();
                } else {
                    throw new Error('ExecCommand failed');
                }
            } catch (fallbackErr) {
                UI.showToast("Failed to copy", 2000);
            }
        }
    }
};
