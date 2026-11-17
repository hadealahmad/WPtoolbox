/**
 * Backup & Restore Tool UI
 */
import '../main.js';
import { App } from '../core/app.js';
import { Backup } from '../core/backup.js';

export const BackupTool = App.registerTool('Backup', {
    resultsId: null,

    onInit: function() {
        const downloadBtn = document.getElementById('download-backup-btn');
        const clearBtn = document.getElementById('clear-data-btn');
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.handleExport());
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.handleClear());
        }
        if (dropZone && fileInput) {
            dropZone.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInput.click();
                }
            });
        }

        this.renderSummary();
    },

    onLanguageChange: function() {
        this.renderSummary();
    },

    getSelectedMode: function() {
        const checked = document.querySelector('input[name="restore-mode"]:checked');
        return checked?.value === 'replace' ? 'replace' : 'merge';
    },

    setStatus: function(message, tone = 'info') {
        const statusEl = document.getElementById('backup-status');
        if (!statusEl) return;

        statusEl.className = 'rounded-xl border p-4 text-xs leading-relaxed';
        if (tone === 'error') {
            statusEl.classList.add('border-red-500/40', 'bg-red-950/30', 'text-red-200');
        } else if (tone === 'success') {
            statusEl.classList.add('border-emerald-500/40', 'bg-emerald-950/30', 'text-emerald-200');
        } else {
            statusEl.classList.add('border-zinc-800', 'bg-zinc-950/70', 'text-zinc-200');
        }

        statusEl.replaceChildren(App.h('p', { text: String(message || '') }));
        statusEl.classList.remove('hidden');
    },

    renderSummary: function() {
        const list = document.getElementById('backup-storage-list');
        const totalSizeEl = document.getElementById('backup-total-size');
        if (!list) return;

        const summary = Backup.getStorageSummary();
        if (totalSizeEl) {
            totalSizeEl.textContent = App.formatSize(summary.totalBytes) || `0 ${App.t('unit_bytes')}`;
        }

        const rows = summary.items.map((item) => {
            const label = App.t(item.labelKey) || item.fallbackLabel;
            const sizeText = App.formatSize(item.bytes) || `0 ${App.t('unit_bytes')}`;
            const countDisplay = item.summaryKey === 'lang'
                ? (item.value ? String(item.value).toUpperCase() : '—')
                : String(item.count);

            return App.h(
                'li',
                { class: 'py-3 flex items-center justify-between gap-4 text-xs' },
                App.h(
                    'div',
                    { class: 'min-w-0' },
                    App.h('span', { class: 'font-medium text-zinc-200', text: label })
                ),
                App.h(
                    'div',
                    { class: 'flex items-center gap-3 shrink-0 font-mono' },
                    App.h('span', {
                        class: `px-2 py-0.5 rounded-md border ${item.count > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`,
                        text: countDisplay
                    }),
                    App.h('span', { class: 'text-zinc-400 w-20 text-end', text: sizeText })
                )
            );
        });

        list.replaceChildren(...rows);
    },

    handleExport: function() {
        App.exportBackup();
        const msg = App.t('backup_msg_exported');
        App.showToast(msg, { type: 'success' });
        this.setStatus(msg, 'success');
    },

    onFile: async function(file) {
        const fileInput = document.getElementById('file-input');
        if (!file) return;

        const mode = this.getSelectedMode();
        try {
            const result = await App.importBackup(file, { mode });
            if (!result.confirmed) {
                const cancelMsg = App.t('backup_msg_cancelled');
                this.setStatus(cancelMsg, 'info');
                return;
            }
            this.renderSummary();
            this.setStatus(App.t('backup_msg_restored'), 'success');
        } catch (err) {
            const errMsg = err?.message || App.t('backup_err_malformed');
            App.showToast(errMsg, { type: 'error' });
            this.setStatus(errMsg, 'error');
        } finally {
            if (fileInput) fileInput.value = '';
        }
    },

    handleClear: async function() {
        const ok = await App.confirm(App.t('backup_clear_confirm'), { danger: true });
        if (!ok) return;

        Backup.clearLocalData();
        this.renderSummary();
        const msg = App.t('backup_msg_cleared');
        App.showToast(msg, { type: 'success' });
        this.setStatus(msg, 'success');
    }
});
