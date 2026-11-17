import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { App } from '../../src/core/app.js';
import {
  Backup,
  BACKUP_APP,
  BACKUP_SCHEMA_VERSION,
  MAX_BACKUP_BYTES,
} from '../../src/core/backup.js';
import { I18n } from '../../src/core/i18n.js';
import { UI } from '../../src/core/ui.js';
import { Utils } from '../../src/core/utils.js';

describe('Backup & Restore (core/backup.js + App facade)', () => {
  beforeEach(async () => {
    await I18n.loadData();
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = '<div id="toast"><div><span id="toast-msg"></span></div></div>';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports expected shape with all wptoolbox_* keys and excludes wpt-consent', () => {
    localStorage.setItem('wpt-consent', 'all');
    localStorage.setItem('unrelated_other_app', 'keep-me');
    localStorage.setItem('wptoolbox_lang', 'ar');
    localStorage.setItem('wptoolbox_favs', JSON.stringify(['1', 'user_1']));
    localStorage.setItem('wptoolbox_stacks', JSON.stringify([
      { id: 101, name: 'Starter', themes: ['blocksy'], plugins: ['seo-by-rank-math'] },
    ]));
    localStorage.setItem('wptoolbox_blocksy_palettes', JSON.stringify([
      { id: 'pal_1', name: 'Brand', mode: 'dark', colors: ['#2872fa', '#1559ed'] },
    ]));
    localStorage.setItem('wptoolbox_checklist_sites', JSON.stringify([
      { id: 'site_1', name: 'Prod', url: 'https://example.com', tasks: [] },
    ]));
    localStorage.setItem('wptoolbox_checklist_active_site', 'site_1');
    localStorage.setItem('wptoolbox_user_snippets', JSON.stringify([
      { id: 'user_1', title: 'Disable XML-RPC', category: 'Security', description: 'Desc', code: 'add_filter(...);', language: 'PHP' },
    ]));

    const dlSpy = vi.spyOn(Utils, 'downloadFile').mockImplementation(() => {});

    const backup = App.exportBackup();

    expect(backup.app).toBe(BACKUP_APP);
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(typeof backup.exportedAt).toBe('string');
    expect(() => new Date(backup.exportedAt).toISOString()).not.toThrow();

    expect(Object.keys(backup.data)).toEqual([
      'wptoolbox_checklist_sites',
      'wptoolbox_checklist_active_site',
      'wptoolbox_user_snippets',
      'wptoolbox_favs',
      'wptoolbox_blocksy_palettes',
      'wptoolbox_stacks',
      'wptoolbox_lang',
    ]);
    expect(backup.data['wpt-consent']).toBeUndefined();
    expect(backup.data.unrelated_other_app).toBeUndefined();

    expect(dlSpy).toHaveBeenCalledTimes(1);
    const [, filename, mimeType] = dlSpy.mock.calls[0];
    expect(filename).toMatch(/^wptoolbox-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(mimeType).toBe('application/json');
  });

  it('roundtrips export -> clear -> import (replace) preserving original sanitized data and consent', async () => {
    localStorage.setItem('wpt-consent', 'granted');
    localStorage.setItem('wptoolbox_lang', 'ar');
    localStorage.setItem('wptoolbox_favs', JSON.stringify(['2', 'user_10']));
    localStorage.setItem('wptoolbox_stacks', JSON.stringify([
      { id: 42, name: 'Agency Stack', themes: ['blocksy'], plugins: ['woocommerce'] },
    ]));
    localStorage.setItem('wptoolbox_blocksy_palettes', JSON.stringify([
      {
        id: 'pal_42',
        name: 'Ocean',
        mode: 'light',
        colors: ['#112233', '#445566', '#3a4f66', '#192a3d', '#e1e8ed', '#f2f5f7', '#fafbfc', '#ffffff'],
      },
    ]));
    localStorage.setItem('wptoolbox_checklist_sites', JSON.stringify([
      {
        id: 'site_42',
        name: 'Client Portal',
        url: 'https://client.example.org/',
        tasks: [
          {
            id: 't1',
            category: { en: 'SEO', ar: 'SEO' },
            title: { en: 'Sitemap', ar: 'Sitemap' },
            description: { en: 'Verify', ar: 'Verify' },
            completed: true,
          },
        ],
      },
    ]));
    localStorage.setItem('wptoolbox_checklist_active_site', 'site_42');
    localStorage.setItem('wptoolbox_user_snippets', JSON.stringify([
      {
        id: 'user_10',
        title: { en: 'Custom Hook', ar: 'Custom Hook' },
        category: { en: 'Hooks', ar: 'Hooks' },
        description: { en: 'Runs on init', ar: 'Runs on init' },
        code: 'add_action("init", "__return_true");',
        language: 'PHP',
        isUser: true,
      },
    ]));

    vi.spyOn(Utils, 'downloadFile').mockImplementation(() => {});
    const exported = App.exportBackup();
    const expectedSnapshot = {
      lang: localStorage.getItem('wptoolbox_lang'),
      favs: JSON.parse(localStorage.getItem('wptoolbox_favs')),
      stacks: JSON.parse(localStorage.getItem('wptoolbox_stacks')),
      palettes: JSON.parse(localStorage.getItem('wptoolbox_blocksy_palettes')),
      sites: JSON.parse(localStorage.getItem('wptoolbox_checklist_sites')),
      activeSite: localStorage.getItem('wptoolbox_checklist_active_site'),
      snippets: JSON.parse(localStorage.getItem('wptoolbox_user_snippets')),
    };

    Backup.clearLocalData();
    expect(localStorage.getItem('wptoolbox_checklist_sites')).toBeNull();
    expect(localStorage.getItem('wptoolbox_user_snippets')).toBeNull();
    expect(localStorage.getItem('wpt-consent')).toBe('granted');

    const confirmSpy = vi.spyOn(UI, 'confirm').mockResolvedValue(true);
    const file = new File([JSON.stringify(exported)], 'wptoolbox-backup-2026-11-18.json', {
      type: 'application/json',
    });

    const result = await App.importBackup(file, { mode: 'replace', reload: false });
    expect(result.confirmed).toBe(true);
    expect(result.written).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Replace'), { danger: true });

    expect(localStorage.getItem('wptoolbox_lang')).toBe(expectedSnapshot.lang);
    expect(JSON.parse(localStorage.getItem('wptoolbox_favs'))).toEqual(expectedSnapshot.favs);
    expect(JSON.parse(localStorage.getItem('wptoolbox_stacks'))).toEqual(expectedSnapshot.stacks);
    expect(JSON.parse(localStorage.getItem('wptoolbox_blocksy_palettes'))).toEqual(expectedSnapshot.palettes);
    expect(JSON.parse(localStorage.getItem('wptoolbox_checklist_sites'))).toEqual(expectedSnapshot.sites);
    expect(localStorage.getItem('wptoolbox_checklist_active_site')).toBe(expectedSnapshot.activeSite);
    expect(JSON.parse(localStorage.getItem('wptoolbox_user_snippets'))).toEqual(expectedSnapshot.snippets);
    expect(localStorage.getItem('wpt-consent')).toBe('granted');
  });

  it('merges items by id and name without duplicating existing items or deleting them', async () => {
    localStorage.setItem('wptoolbox_lang', 'en');
    localStorage.setItem('wptoolbox_favs', JSON.stringify(['1', 'user_a']));
    localStorage.setItem('wptoolbox_stacks', JSON.stringify([
      { id: 1, name: 'Existing Stack', themes: ['blocksy'], plugins: [] },
    ]));
    localStorage.setItem('wptoolbox_blocksy_palettes', JSON.stringify([
      { id: 'pal_1', name: 'Existing Palette', mode: 'dark', colors: ['#111111'] },
    ]));
    localStorage.setItem('wptoolbox_checklist_sites', JSON.stringify([
      { id: 'site_1', name: 'Existing Site', url: 'https://existing.test/', tasks: [] },
    ]));
    localStorage.setItem('wptoolbox_user_snippets', JSON.stringify([
      { id: 'user_a', title: 'Existing Snippet', category: 'PHP', description: 'd', code: 'echo 1;', language: 'PHP' },
    ]));

    vi.spyOn(UI, 'confirm').mockResolvedValue(true);

    const incomingBackup = {
      app: BACKUP_APP,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: '2026-11-18T00:00:00.000Z',
      data: {
        wptoolbox_lang: 'ar',
        wptoolbox_favs: ['user_a', 'user_b', '2'],
        wptoolbox_stacks: [
          { id: 1, name: 'Duplicate By ID', themes: ['astra'], plugins: [] },
          { id: 99, name: 'existing stack', themes: ['astra'], plugins: [] },
          { id: 2, name: 'New Stack', themes: ['kadence'], plugins: ['litespeed-cache'] },
        ],
        wptoolbox_blocksy_palettes: [
          { id: 'pal_1', name: 'Dup ID', mode: 'light', colors: ['#222222'] },
          { id: 'pal_99', name: 'EXISTING PALETTE', mode: 'light', colors: ['#222222'] },
          { id: 'pal_2', name: 'New Palette', mode: 'light', colors: ['#abcdef'] },
        ],
        wptoolbox_checklist_sites: [
          { id: 'site_1', name: 'Dup ID', url: 'https://dup.test', tasks: [] },
          { id: 'site_99', name: 'existing site', url: 'https://dup2.test', tasks: [] },
          { id: 'site_2', name: 'New Site', url: 'https://new.test', tasks: [] },
        ],
        wptoolbox_user_snippets: [
          { id: 'user_a', title: 'Dup ID', category: 'PHP', description: 'd', code: 'x', language: 'PHP' },
          { id: 'user_z', title: 'existing snippet', category: 'PHP', description: 'd', code: 'x', language: 'PHP' },
          { id: 'user_b', title: 'New Snippet', category: 'CSS', description: 'd2', code: 'body{}', language: 'CSS' },
        ],
      },
    };

    const res = await App.importBackup(incomingBackup, { mode: 'merge', reload: false });
    expect(res.written).toBe(true);

    expect(localStorage.getItem('wptoolbox_lang')).toBe('en');
    expect(JSON.parse(localStorage.getItem('wptoolbox_favs'))).toEqual(['1', 'user_a', 'user_b', '2']);

    const stacks = JSON.parse(localStorage.getItem('wptoolbox_stacks'));
    expect(stacks).toHaveLength(2);
    expect(stacks.map(s => s.name)).toEqual(['Existing Stack', 'New Stack']);

    const palettes = JSON.parse(localStorage.getItem('wptoolbox_blocksy_palettes'));
    expect(palettes).toHaveLength(2);
    expect(palettes.map(p => p.name)).toEqual(['Existing Palette', 'New Palette']);

    const sites = JSON.parse(localStorage.getItem('wptoolbox_checklist_sites'));
    expect(sites).toHaveLength(2);
    expect(sites.map(s => s.name)).toEqual(['Existing Site', 'New Site']);

    const snippets = JSON.parse(localStorage.getItem('wptoolbox_user_snippets'));
    expect(snippets).toHaveLength(2);
    expect(snippets.map(s => s.title.en)).toEqual(['Existing Snippet', 'New Snippet']);
  });

  it('does not write anything if user cancels App.confirm', async () => {
    localStorage.setItem('wptoolbox_favs', JSON.stringify(['keep']));
    vi.spyOn(UI, 'confirm').mockResolvedValue(false);

    const result = await App.importBackup({
      app: BACKUP_APP,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      data: { wptoolbox_favs: ['replace_attempt'] },
    }, { mode: 'replace', reload: false });

    expect(result.confirmed).toBe(false);
    expect(result.written).toBe(false);
    expect(JSON.parse(localStorage.getItem('wptoolbox_favs'))).toEqual(['keep']);
  });

  it('rejects wrong app, unsupported schemaVersion, missing data, malformed JSON, and oversized files', async () => {
    const confirmSpy = vi.spyOn(UI, 'confirm').mockResolvedValue(true);

    await expect(App.importBackup({ app: 'OtherApp', schemaVersion: 1, data: {} }, { reload: false }))
      .rejects.toThrow(/valid WPToolbox backup/i);

    await expect(App.importBackup({ app: BACKUP_APP, schemaVersion: 99, data: {} }, { reload: false }))
      .rejects.toThrow(/schema version/i);

    await expect(App.importBackup({ app: BACKUP_APP, schemaVersion: 1, data: [] }, { reload: false }))
      .rejects.toThrow(/data/i);

    const malformedFile = new File(['{not-valid-json'], 'bad.json', { type: 'application/json' });
    await expect(App.importBackup(malformedFile, { reload: false }))
      .rejects.toThrow(/Invalid JSON/i);

    const oversizedBlob = new Blob([new Uint8Array(MAX_BACKUP_BYTES + 1)], { type: 'application/json' });
    await expect(App.importBackup(oversizedBlob, { reload: false }))
      .rejects.toThrow(/5 MB/i);

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('sanitizes XSS payloads, invalid CSS colors, and javascript: URLs, and ignores unknown keys + wpt-consent', async () => {
    localStorage.setItem('wpt-consent', 'denied');
    vi.spyOn(UI, 'confirm').mockResolvedValue(true);

    const malicious = {
      app: BACKUP_APP,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: '2026-11-18T00:00:00.000Z',
      data: {
        'wpt-consent': 'all',
        unknown_key: 'should-not-be-written',
        wptoolbox_lang: 'fr',
        wptoolbox_checklist_sites: [
          {
            id: 'evil-site',
            name: '<img src=x onerror=window.__xss=1>',
            url: 'javascript:alert(1)',
            tasks: [{ id: 't1', title: '<script>alert(1)</script>', completed: 'yes' }],
          },
          {
            id: 'data-site',
            name: 'Data URL Site',
            url: 'data:text/html,<script>alert(1)</script>',
            tasks: [],
          },
          {
            id: 'good-site',
            name: 'Good Site',
            url: 'https://safe.example.com/wp',
            tasks: [],
          },
        ],
        wptoolbox_blocksy_palettes: [
          {
            id: 'evil-pal',
            name: 'Evil Palette',
            mode: 'invalid-mode',
            colors: ['javascript:alert(1)', 'red;background:url(x)', '#ABC'],
          },
        ],
        wptoolbox_user_snippets: [
          {
            id: 'evil-snip',
            title: '<img src=x onerror=window.__xss=1>',
            code: '<script>window.__xss=1</script>',
            language: 'HTML',
          },
        ],
        wptoolbox_stacks: [
          {
            id: 'evil-stack',
            name: '  ',
            themes: ['blocksy', { evil: true }],
            plugins: [123, null],
          },
        ],
      },
    };

    await App.importBackup(malicious, { mode: 'replace', reload: false });

    // Consent never overwritten & unknown keys ignored
    expect(localStorage.getItem('wpt-consent')).toBe('denied');
    expect(localStorage.getItem('unknown_key')).toBeNull();
    expect(localStorage.getItem('wptoolbox_lang')).toBeNull();

    // javascript: and data: URLs stripped on import
    const sites = JSON.parse(localStorage.getItem('wptoolbox_checklist_sites'));
    expect(sites[0].url).toBe('');
    expect(sites[1].url).toBe('');
    expect(sites[2].url).toBe('https://safe.example.com/wp');
    expect(sites[0].tasks[0].completed).toBe(true);

    // Palette colors sanitized to safe 8 hex slots
    const palettes = JSON.parse(localStorage.getItem('wptoolbox_blocksy_palettes'));
    expect(palettes[0].mode).toBe('dark');
    expect(palettes[0].colors).toEqual([
      '#2872fa',
      '#1559ed',
      '#aabbcc',
      '#192a3d',
      '#e1e8ed',
      '#f2f5f7',
      '#fafbfc',
      '#ffffff',
    ]);

    // Stacks sanitized
    const stacks = JSON.parse(localStorage.getItem('wptoolbox_stacks'));
    expect(stacks[0]).toEqual({
      id: 'evil-stack',
      name: 'Stack',
      themes: ['blocksy'],
      plugins: ['123'],
    });
  });
});
