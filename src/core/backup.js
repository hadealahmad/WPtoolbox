/**
 * WPToolbox Site-Wide Backup & Restore Manager
 */
import { State } from './state.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';
import {
    getSafeHttpUrl,
    sanitizeImportedSites,
    sanitizeSavedPalettes,
    sanitizeSavedStacks,
    sanitizeUserSnippets
} from './sanitizers.js';

export const BACKUP_APP = 'WPToolbox';
export const BACKUP_SCHEMA_VERSION = 1;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024; // 5 MiB
export const BACKUP_FLASH_KEY = 'wpt_backup_flash';

function tr(key, fallback) {
    const val = State.translations?.[State.currentLang]?.[key];
    return val !== undefined ? val : fallback;
}

function byteSize(str) {
    const s = String(str ?? '');
    if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(s).length;
    }
    return s.length * 2;
}

function readJsonStorage(key) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return { present: false, value: null };
        return { present: true, value: JSON.parse(raw) };
    } catch {
        return { present: false, value: null };
    }
}

function mergeByIdOrName(existing, incoming, getName) {
    const base = Array.isArray(existing) ? [...existing] : [];
    const add = Array.isArray(incoming) ? incoming : [];
    const seenIds = new Set(
        base.map(item => String(item?.id ?? '')).filter(Boolean)
    );
    const seenNames = new Set(
        base.map(item => String(getName(item) || '').trim().toLowerCase()).filter(Boolean)
    );

    for (const item of add) {
        const id = String(item?.id ?? '');
        const name = String(getName(item) || '').trim().toLowerCase();
        if (id && seenIds.has(id)) continue;
        if (name && seenNames.has(name)) continue;
        base.push(item);
        if (id) seenIds.add(id);
        if (name) seenNames.add(name);
    }
    return base;
}

export const BACKUP_REGISTRY = {
    wptoolbox_checklist_sites: {
        type: 'json',
        summaryKey: 'checklistSites',
        labelKey: 'backup_type_checklist_sites',
        fallbackLabel: 'Checklist sites',
        sanitize: (raw) => sanitizeImportedSites(raw).map(site => ({
            ...site,
            url: getSafeHttpUrl(site.url)
        })),
        merge: (existing, incoming) => mergeByIdOrName(existing, incoming, item => item?.name),
        count: (val) => (Array.isArray(val) ? val.length : 0)
    },
    wptoolbox_checklist_active_site: {
        type: 'string',
        summaryKey: null,
        labelKey: null,
        fallbackLabel: null,
        sanitize: (raw) => (typeof raw === 'string' || typeof raw === 'number') ? String(raw).trim() : '',
        merge: (existing, incoming) => existing || incoming,
        count: (val) => (val ? 1 : 0)
    },
    wptoolbox_user_snippets: {
        type: 'json',
        summaryKey: 'snippets',
        labelKey: 'backup_type_snippets',
        fallbackLabel: 'Custom snippets',
        sanitize: (raw) => sanitizeUserSnippets(raw),
        merge: (existing, incoming) => mergeByIdOrName(existing, incoming, item => item?.title?.en || item?.title?.ar),
        count: (val) => (Array.isArray(val) ? val.length : 0)
    },
    wptoolbox_favs: {
        type: 'json',
        summaryKey: 'favs',
        labelKey: 'backup_type_favs',
        fallbackLabel: 'Favorite snippets',
        sanitize: (raw) => Array.isArray(raw)
            ? [...new Set(raw.filter(v => typeof v === 'string' || typeof v === 'number').map(v => String(v).trim()).filter(Boolean))]
            : [],
        merge: (existing, incoming) => [...new Set([
            ...(Array.isArray(existing) ? existing : []),
            ...(Array.isArray(incoming) ? incoming : [])
        ])],
        count: (val) => (Array.isArray(val) ? val.length : 0)
    },
    wptoolbox_blocksy_palettes: {
        type: 'json',
        summaryKey: 'palettes',
        labelKey: 'backup_type_palettes',
        fallbackLabel: 'Blocksy palettes',
        sanitize: (raw) => sanitizeSavedPalettes(raw),
        merge: (existing, incoming) => mergeByIdOrName(existing, incoming, item => item?.name),
        count: (val) => (Array.isArray(val) ? val.length : 0)
    },
    wptoolbox_stacks: {
        type: 'json',
        summaryKey: 'stacks',
        labelKey: 'backup_type_stacks',
        fallbackLabel: 'Saved stacks',
        sanitize: (raw) => sanitizeSavedStacks(raw),
        merge: (existing, incoming) => mergeByIdOrName(existing, incoming, item => item?.name),
        count: (val) => (Array.isArray(val) ? val.length : 0)
    },
    wptoolbox_lang: {
        type: 'string',
        summaryKey: 'lang',
        labelKey: 'backup_type_lang',
        fallbackLabel: 'Language preference',
        sanitize: (raw) => (raw === 'en' || raw === 'ar') ? raw : null,
        merge: (existing, incoming) => (existing === 'en' || existing === 'ar') ? existing : incoming,
        count: (val) => (val === 'en' || val === 'ar') ? 1 : 0
    }
};

function computeCounts(dataObj) {
    return {
        checklistSites: BACKUP_REGISTRY.wptoolbox_checklist_sites.count(dataObj.wptoolbox_checklist_sites),
        snippets: BACKUP_REGISTRY.wptoolbox_user_snippets.count(dataObj.wptoolbox_user_snippets),
        favs: BACKUP_REGISTRY.wptoolbox_favs.count(dataObj.wptoolbox_favs),
        palettes: BACKUP_REGISTRY.wptoolbox_blocksy_palettes.count(dataObj.wptoolbox_blocksy_palettes),
        stacks: BACKUP_REGISTRY.wptoolbox_stacks.count(dataObj.wptoolbox_stacks),
        lang: dataObj.wptoolbox_lang || null
    };
}

function formatConfirmSummary(counts, mode) {
    const modeLabel = mode === 'replace'
        ? tr('backup_mode_replace', 'Replace')
        : tr('backup_mode_merge', 'Merge');

    const lines = [
        `${tr('backup_confirm_mode', 'Restore mode')}: ${modeLabel}`,
        `- ${tr('backup_type_checklist_sites', 'Checklist sites')}: ${counts.checklistSites}`,
        `- ${tr('backup_type_snippets', 'Custom snippets')}: ${counts.snippets}`,
        `- ${tr('backup_type_favs', 'Favorite snippets')}: ${counts.favs}`,
        `- ${tr('backup_type_palettes', 'Blocksy palettes')}: ${counts.palettes}`,
        `- ${tr('backup_type_stacks', 'Saved stacks')}: ${counts.stacks}`
    ];

    if (counts.lang) {
        lines.push(`- ${tr('backup_type_lang', 'Language preference')}: ${counts.lang.toUpperCase()}`);
    }

    lines.push('', tr('backup_confirm_prompt', 'Apply this backup to your browser storage?'));
    return lines.join('\n');
}

function formatSuccessSummary(counts) {
    const total = counts.checklistSites + counts.snippets + counts.favs + counts.palettes + counts.stacks + (counts.lang ? 1 : 0);
    const prefix = tr('backup_msg_restored', 'Backup restored');
    return `${prefix}: ${counts.checklistSites} ${tr('backup_unit_sites', 'sites')}, ${counts.snippets} ${tr('backup_unit_snippets', 'snippets')}, ${counts.palettes} ${tr('backup_unit_palettes', 'palettes')}, ${counts.stacks} ${tr('backup_unit_stacks', 'stacks')}, ${counts.favs} ${tr('backup_unit_favs', 'favorites')} (${total} total).`;
}

export const Backup = {
    buildBackupPayload() {
        const data = {};
        for (const [key, entry] of Object.entries(BACKUP_REGISTRY)) {
            const raw = localStorage.getItem(key);
            if (raw === null) continue;

            if (entry.type === 'json') {
                try {
                    const parsed = JSON.parse(raw);
                    data[key] = entry.sanitize(parsed);
                } catch {
                    // Skip corrupted storage key rather than failing the whole export
                }
            } else {
                const sanitized = entry.sanitize(raw);
                if (sanitized !== null) {
                    data[key] = sanitized;
                }
            }
        }

        return {
            app: BACKUP_APP,
            schemaVersion: BACKUP_SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            data
        };
    },

    exportBackup(options = {}) {
        const { download = true } = options || {};
        const payload = this.buildBackupPayload();

        if (download) {
            const dateStr = payload.exportedAt.slice(0, 10);
            const filename = `wptoolbox-backup-${dateStr}.json`;
            const downloadFn = (typeof window !== 'undefined' && window.App?.downloadFile)
                ? window.App.downloadFile.bind(window.App)
                : Utils.downloadFile.bind(Utils);
            downloadFn(JSON.stringify(payload, null, 2), filename, 'application/json');
        }

        return payload;
    },

    async parseAndValidateBackup(fileOrObject) {
        let parsed;

        if (typeof Blob !== 'undefined' && fileOrObject instanceof Blob) {
            if (fileOrObject.size > MAX_BACKUP_BYTES) {
                throw new Error(tr('backup_err_too_large', 'Backup file exceeds the 5 MB size limit.'));
            }
            const text = typeof fileOrObject.text === 'function'
                ? await fileOrObject.text()
                : await new Response(fileOrObject).text();
            if (byteSize(text) > MAX_BACKUP_BYTES) {
                throw new Error(tr('backup_err_too_large', 'Backup file exceeds the 5 MB size limit.'));
            }
            try {
                parsed = JSON.parse(text);
            } catch {
                throw new Error(tr('backup_err_malformed', 'Invalid JSON in backup file.'));
            }
        } else if (typeof fileOrObject === 'string') {
            if (byteSize(fileOrObject) > MAX_BACKUP_BYTES) {
                throw new Error(tr('backup_err_too_large', 'Backup file exceeds the 5 MB size limit.'));
            }
            try {
                parsed = JSON.parse(fileOrObject);
            } catch {
                throw new Error(tr('backup_err_malformed', 'Invalid JSON in backup file.'));
            }
        } else if (fileOrObject && typeof fileOrObject === 'object' && !Array.isArray(fileOrObject)) {
            if (byteSize(JSON.stringify(fileOrObject)) > MAX_BACKUP_BYTES) {
                throw new Error(tr('backup_err_too_large', 'Backup data exceeds the 5 MB size limit.'));
            }
            parsed = fileOrObject;
        } else {
            throw new Error(tr('backup_err_malformed', 'Invalid backup input.'));
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error(tr('backup_err_malformed', 'Backup root must be a JSON object.'));
        }

        if (parsed.app !== BACKUP_APP) {
            throw new Error(tr('backup_err_invalid_app', 'Not a valid WPToolbox backup file.'));
        }

        if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
            throw new Error(tr('backup_err_schema', 'Unsupported backup schema version.'));
        }

        if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
            throw new Error(tr('backup_err_data', 'Backup file is missing a valid data object.'));
        }

        const sanitizedData = {};
        for (const [key, entry] of Object.entries(BACKUP_REGISTRY)) {
            if (!Object.prototype.hasOwnProperty.call(parsed.data, key)) continue;
            const sanitized = entry.sanitize(parsed.data[key]);
            if (key === 'wptoolbox_lang' && sanitized === null) continue;
            sanitizedData[key] = sanitized;
        }

        return {
            app: BACKUP_APP,
            schemaVersion: BACKUP_SCHEMA_VERSION,
            exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
            data: sanitizedData,
            counts: computeCounts(sanitizedData)
        };
    },

    async importBackup(fileOrObject, options = {}) {
        const { mode = 'merge', reload = true } = options || {};
        if (mode !== 'merge' && mode !== 'replace') {
            throw new Error(`Invalid backup import mode: ${String(mode)}`);
        }

        const validated = await this.parseAndValidateBackup(fileOrObject);
        const confirmMessage = formatConfirmSummary(validated.counts, mode);
        const confirmFn = (typeof window !== 'undefined' && window.App?.confirm)
            ? window.App.confirm.bind(window.App)
            : UI.confirm.bind(UI);

        const confirmed = await confirmFn(confirmMessage, { danger: mode === 'replace' });
        if (!confirmed) {
            return {
                confirmed: false,
                written: false,
                mode,
                counts: validated.counts
            };
        }

        for (const [key, entry] of Object.entries(BACKUP_REGISTRY)) {
            if (!Object.prototype.hasOwnProperty.call(validated.data, key)) continue;
            const incoming = validated.data[key];

            if (mode === 'replace') {
                if (entry.type === 'json') {
                    localStorage.setItem(key, JSON.stringify(incoming));
                } else {
                    localStorage.setItem(key, String(incoming));
                }
            } else {
                let existingVal = entry.type === 'json' ? [] : '';
                if (entry.type === 'json') {
                    const existing = readJsonStorage(key);
                    existingVal = existing.present ? entry.sanitize(existing.value) : [];
                } else {
                    const existingRaw = localStorage.getItem(key);
                    existingVal = existingRaw !== null ? entry.sanitize(existingRaw) : null;
                }
                const merged = entry.merge(existingVal, incoming);
                if (entry.type === 'json') {
                    localStorage.setItem(key, JSON.stringify(merged));
                } else if (merged !== null && merged !== undefined) {
                    localStorage.setItem(key, String(merged));
                }
            }
        }

        // Keep active site pointer consistent with stored sites when sites exist
        const storedSites = readJsonStorage('wptoolbox_checklist_sites');
        if (storedSites.present && Array.isArray(storedSites.value)) {
            const active = localStorage.getItem('wptoolbox_checklist_active_site') || '';
            if (active && !storedSites.value.some(s => s && s.id === active)) {
                localStorage.setItem('wptoolbox_checklist_active_site', '');
            }
        }

        const toastMessage = formatSuccessSummary(validated.counts);
        if (reload && typeof sessionStorage !== 'undefined') {
            try {
                sessionStorage.setItem(BACKUP_FLASH_KEY, JSON.stringify({
                    message: toastMessage,
                    type: 'success'
                }));
            } catch {
                // Ignore sessionStorage errors in restricted environments
            }
        }

        const toastFn = (typeof window !== 'undefined' && window.App?.showToast)
            ? window.App.showToast.bind(window.App)
            : UI.showToast.bind(UI);
        toastFn(toastMessage, { type: 'success' });

        if (reload && typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
            try {
                window.location.reload();
            } catch {
                // Ignore reload errors in non-browser test environments
            }
        }

        return {
            confirmed: true,
            written: true,
            mode,
            counts: validated.counts,
            data: validated.data
        };
    },

    getStorageSummary() {
        const items = [];
        let totalBytes = 0;
        let totalItems = 0;

        for (const [key, entry] of Object.entries(BACKUP_REGISTRY)) {
            const raw = localStorage.getItem(key);
            const bytes = raw !== null ? byteSize(raw) : 0;
            totalBytes += bytes;

            if (!entry.summaryKey) continue;

            let count = 0;
            let value = null;
            if (raw !== null) {
                if (entry.type === 'json') {
                    try {
                        value = entry.sanitize(JSON.parse(raw));
                        count = entry.count(value);
                    } catch {
                        count = 0;
                    }
                } else {
                    value = entry.sanitize(raw);
                    count = entry.count(value);
                }
            }

            totalItems += count;
            items.push({
                key,
                summaryKey: entry.summaryKey,
                labelKey: entry.labelKey,
                fallbackLabel: entry.fallbackLabel,
                count,
                bytes,
                value
            });
        }

        return { items, totalItems, totalBytes };
    },

    clearLocalData() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('wptoolbox_')) {
                keysToRemove.push(k);
            }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        return keysToRemove;
    }
};
