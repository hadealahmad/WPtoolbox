/**
 * WPToolbox Consent Mode v2 Manager
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

export const Consent = {
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
        }

        return true;
    }
};
