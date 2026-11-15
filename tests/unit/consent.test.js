import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Consent } from '../../src/core/consent.js';

describe('Consent', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.gtag;
  });

  afterEach(() => {
    localStorage.clear();
    delete window.gtag;
  });

  it('returns null when no consent is stored or value is invalid', () => {
    expect(Consent.getConsent()).toBeNull();
    localStorage.setItem('wpt-consent', 'invalid');
    expect(Consent.getConsent()).toBeNull();
  });

  it('persists valid consent levels and updates gtag consent state', () => {
    const gtagMock = vi.fn();
    window.gtag = gtagMock;

    expect(Consent.setConsent('granted')).toBe(true);
    expect(Consent.getConsent()).toBe('granted');
    expect(gtagMock).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });

    expect(Consent.setConsent('all')).toBe(true);
    expect(Consent.getConsent()).toBe('all');
    expect(gtagMock).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });

    expect(Consent.setConsent('denied')).toBe(true);
    expect(Consent.getConsent()).toBe('denied');
    expect(gtagMock).toHaveBeenCalledWith('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  });

  it('rejects unknown consent levels without modifying storage', () => {
    expect(Consent.setConsent('bogus')).toBe(false);
    expect(Consent.getConsent()).toBeNull();
  });
});
