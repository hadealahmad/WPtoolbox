/**
 * WPToolbox Shared Data Sanitizers
 * Pure validation/sanitization functions shared by tool modules and Backup & Restore.
 */

export const DEFAULT_PALETTE = [
    '#2872fa',
    '#1559ed',
    '#3a4f66',
    '#192a3d',
    '#e1e8ed',
    '#f2f5f7',
    '#fafbfc',
    '#ffffff'
];

const HEX_RE = /^#[0-9a-f]{3,8}$/i;

export function safeHex(val, fallback = '#2872fa') {
    const s = String(val || '').trim();
    if (!HEX_RE.test(s)) return fallback;
    if (s.length === 4) {
        return '#' + s.slice(1).split('').map(c => c + c).join('').toLowerCase();
    }
    return s.slice(0, 7).toLowerCase();
}

export function sanitizePaletteColors(arr) {
    const src = Array.isArray(arr) ? arr : [];
    return DEFAULT_PALETTE.map((fb, i) => safeHex(src[i], fb));
}

export function sanitizeSavedPalettes(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(p => p && typeof p === 'object')
        .map((p, idx) => {
            const createdAt = Number(p.createdAt);
            const item = {
                id: String(p.id || `palette_${Date.now()}_${idx}`),
                name: String(p.name || 'Palette').trim() || 'Palette',
                mode: p.mode === 'light' ? 'light' : 'dark',
                colors: sanitizePaletteColors(p.colors)
            };
            if (Number.isFinite(createdAt) && createdAt > 0) {
                item.createdAt = createdAt;
            }
            return item;
        });
}

export function getSafeHttpUrl(raw) {
    const val = String(raw || '').trim();
    if (!val) return '';
    try {
        const parsed = new URL(val);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch {
        return '';
    }
    return '';
}

export function sanitizeImportedSites(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(s => s && typeof s === 'object')
        .map((s, idx) => ({
            id: String(s.id || `site_${Date.now()}_${idx}`),
            name: String(s.name || 'Imported Site'),
            url: String(s.url || ''),
            tasks: Array.isArray(s.tasks)
                ? s.tasks.filter(t => t && typeof t === 'object').map((t, tIdx) => ({
                    id: String(t.id || `task_${Date.now()}_${tIdx}`),
                    category: t.category && typeof t.category === 'object'
                        ? { en: String(t.category.en || 'General'), ar: String(t.category.ar || t.category.en || 'عام') }
                        : { en: String(t.category || 'General'), ar: String(t.category || 'General') },
                    title: t.title && typeof t.title === 'object'
                        ? { en: String(t.title.en || ''), ar: String(t.title.ar || t.title.en || '') }
                        : { en: String(t.title || ''), ar: String(t.title || '') },
                    description: t.description && typeof t.description === 'object'
                        ? { en: String(t.description.en || ''), ar: String(t.description.ar || t.description.en || '') }
                        : { en: String(t.description || ''), ar: String(t.description || '') },
                    completed: Boolean(t.completed)
                }))
                : []
        }));
}

export function sanitizeUserSnippets(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(s => s && typeof s === 'object')
        .map((s, idx) => ({
            id: String(s.id || `user_${Date.now()}_${idx}`),
            title: s.title && typeof s.title === 'object'
                ? { en: String(s.title.en || ''), ar: String(s.title.ar || s.title.en || '') }
                : { en: String(s.title || ''), ar: String(s.title || '') },
            category: s.category && typeof s.category === 'object'
                ? { en: String(s.category.en || 'Custom'), ar: String(s.category.ar || s.category.en || 'مخصص') }
                : { en: String(s.category || 'Custom'), ar: String(s.category || 'Custom') },
            description: s.description && typeof s.description === 'object'
                ? { en: String(s.description.en || ''), ar: String(s.description.ar || s.description.en || '') }
                : { en: String(s.description || ''), ar: String(s.description || '') },
            code: String(s.code || ''),
            language: String(s.language || 'PHP'),
            isUser: true
        }));
}

export function sanitizeSavedStacks(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(s => s && typeof s === 'object')
        .map((s, idx) => ({
            id: (typeof s.id === 'number' && Number.isFinite(s.id))
                ? s.id
                : (typeof s.id === 'string' && s.id.trim() ? s.id.trim() : `stack_${Date.now()}_${idx}`),
            name: String(s.name || 'Stack').trim() || 'Stack',
            themes: Array.isArray(s.themes)
                ? s.themes.filter(t => typeof t === 'string' || typeof t === 'number').map(String)
                : [],
            plugins: Array.isArray(s.plugins)
                ? s.plugins.filter(p => typeof p === 'string' || typeof p === 'number').map(String)
                : []
        }));
}
