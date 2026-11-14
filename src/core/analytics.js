/**
 * WPToolbox Analytics & Consent Mode v2
 */

const STORAGE_KEY = 'wpt-consent';
const VALID_CONSENT_LEVELS = new Set(['denied', 'granted', 'all']);

const CONSENT_MODE_MAP = {
    denied: {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied'
    },
    granted: {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
    },
    all: {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
    }
};

export const Analytics = {
    _currentToolId: null,
    _outboundBound: false,

    init() {
        if (typeof document === 'undefined' || this._outboundBound) return;
        this._outboundBound = true;

        document.addEventListener('click', (e) => {
            const target = e.target;
            const link = target && typeof target.closest === 'function' ? target.closest('a[href]') : null;
            if (!link) return;

            const rawHref = link.getAttribute('href');
            if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
                return;
            }

            let parsed;
            try {
                parsed = new URL(link.href, window.location.href);
            } catch {
                return;
            }

            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
            if (parsed.hostname && parsed.hostname !== window.location.hostname) {
                this.track('outbound_click', {
                    link_url: parsed.href,
                    link_domain: parsed.hostname
                });
            }
        }, { capture: true });
    },

    setToolId(toolId) {
        if (toolId) {
            this._currentToolId = String(toolId);
        }
    },

    getToolId() {
        if (this._currentToolId) return this._currentToolId;
        if (typeof window !== 'undefined') {
            const tools = window.App && window.App.tools ? Object.keys(window.App.tools) : [];
            if (tools.length > 0) return tools[0];
            const slug = (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/i, '');
            return slug || 'index';
        }
        return 'unknown';
    },

    track(eventName, params = {}) {
        if (!eventName || typeof window === 'undefined') return;
        if (!window.dataLayer || typeof window.dataLayer.push !== 'function') return;

        window.dataLayer.push({
            event: eventName,
            ...params
        });
    },

    getConsent() {
        if (typeof window === 'undefined') return null;
        try {
            const value = window.localStorage.getItem(STORAGE_KEY);
            return VALID_CONSENT_LEVELS.has(value) ? value : null;
        } catch {
            return null;
        }
    },

    setConsent(level) {
        if (!VALID_CONSENT_LEVELS.has(level)) return false;

        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(STORAGE_KEY, level);
            } catch {
                // Ignore storage quota / privacy mode errors
            }

            const consentUpdate = CONSENT_MODE_MAP[level];
            if (typeof window.gtag === 'function') {
                window.gtag('consent', 'update', consentUpdate);
            }

            this.track('consent_update', { consent_level: level });
            window.dispatchEvent(new CustomEvent('consentChanged', { detail: { level } }));
        }

        return true;
    }
};
