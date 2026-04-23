/**
 * WPToolbox Utility Functions
 */
import { UI } from './ui.js';
import { I18n } from './i18n.js';
import JSZip from 'jszip';

export const Utils = {
    initServiceWorker() {
        // Handled by VitePWA via injectRegister: 'script'
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
            URL.revokeObjectURL(url);
        }
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
    },

    formatSize(bytes) {
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
