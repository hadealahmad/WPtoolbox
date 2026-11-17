import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { attachHermeticMonitoring } from './helpers.js';

const XSS_PAYLOAD = '<img src=x onerror=window.__xss=1>';

test.describe('Backup & Restore E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('wpt-consent')) {
        localStorage.setItem('wpt-consent', 'denied');
      }
    });
  });

  test('exports snippet + checklist site, clears data, restores (Replace), and verifies items return', async ({ page }, testInfo) => {
    const monitor = await attachHermeticMonitoring(page);

    // 1. Create a custom snippet
    await page.goto('/snippets.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await page.locator('#add-snippet-btn').click();
    await expect(page.locator('#snippet-modal')).toHaveAttribute('open', '');
    await page.locator('#snippet-title-input').fill('Backup E2E Snippet');
    await page.locator('#snippet-category-input').fill('BackupCat');
    await page.locator('#snippet-description-input').fill('Created for backup E2E');
    await page.locator('#snippet-code-input').fill('add_action("init", "__return_true");');
    await page.locator('#snippet-language-input').fill('PHP');
    await page.locator('#add-snippet-form button[type="submit"]').click();
    await expect(page.locator('.snippet-card', { hasText: 'Backup E2E Snippet' })).toBeVisible();

    // 2. Create a checklist site
    await page.goto('/checklist.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await page.locator('#add-site-btn').click();
    await expect(page.locator('#site-modal')).toHaveAttribute('open', '');
    await page.locator('#site-name-input').fill('Backup E2E Site');
    await page.locator('#site-url-input').fill('https://backup-e2e.example');
    await page.locator('#confirm-add-site-btn').click();
    await expect(page.locator('#active-site-name')).toHaveText('Backup E2E Site');

    // 3. Navigate via the footer "Backup & restore" link
    await page.locator('#wpt-footer-backup-link').click();
    await page.waitForURL(/backup\.html$/);
    await page.waitForFunction(() => window.App?.isReady === true);

    await expect(page.locator('#backup-storage-list')).toContainText('Checklist sites');
    await expect(page.locator('#backup-storage-list')).toContainText('Custom snippets');

    // 4. Download backup JSON
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download-backup-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^wptoolbox-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const backupFilePath = testInfo.outputPath('downloaded-backup.json');
    await download.saveAs(backupFilePath);
    const parsedBackup = JSON.parse(readFileSync(backupFilePath, 'utf8'));
    expect(parsedBackup.app).toBe('WPToolbox');
    expect(parsedBackup.schemaVersion).toBe(1);
    expect(parsedBackup.data['wpt-consent']).toBeUndefined();

    // 5. Clear all local data via Danger Zone
    await page.locator('#clear-data-btn').click();
    const clearDialog = page.locator('dialog.wpt-dialog[open]');
    await expect(clearDialog).toBeVisible();
    await clearDialog.locator('button[value="confirm"]').click();
    await expect(page.locator('#backup-status')).toContainText(/cleared/i);

    const afterClear = await page.evaluate(() => ({
      snippets: localStorage.getItem('wptoolbox_user_snippets'),
      sites: localStorage.getItem('wptoolbox_checklist_sites'),
      consent: localStorage.getItem('wpt-consent'),
    }));
    expect(afterClear.snippets).toBeNull();
    expect(afterClear.sites).toBeNull();
    expect(afterClear.consent).toBe('denied');

    // 6. Restore the downloaded file in Replace mode
    await page.locator('#mode-replace').check();
    await page.locator('#file-input').setInputFiles(backupFilePath);

    const restoreDialog = page.locator('dialog.wpt-dialog[open]');
    await expect(restoreDialog).toBeVisible();
    await expect(restoreDialog).toContainText('Replace');

    await Promise.all([
      page.waitForEvent('load'),
      restoreDialog.locator('button[value="confirm"]').click(),
    ]);
    await page.waitForFunction(() => window.App?.isReady === true);

    // Toast surfaced after reload
    await expect(page.locator('#toast-msg')).toContainText(/Backup restored/i);

    // 7. Verify restored items appear on Snippets and Checklist pages
    await page.goto('/snippets.html');
    await page.waitForFunction(() => window.App?.isReady === true);
    await expect(page.locator('.snippet-card', { hasText: 'Backup E2E Snippet' })).toBeVisible();

    await page.goto('/checklist.html');
    await page.waitForFunction(() => window.App?.isReady === true);
    await expect(page.locator('#sites-list')).toContainText('Backup E2E Site');
    await expect(page.locator('#active-site-name')).toHaveText('Backup E2E Site');

    const { consoleErrors, pageErrors, cspViolations } = await monitor.getErrors();
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(cspViolations).toEqual([]);
  });

  test('imports malicious backup safely without executing XSS or restoring consent', async ({ page }) => {
    const monitor = await attachHermeticMonitoring(page);

    await page.goto('/backup.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    const maliciousPayload = {
      app: 'WPToolbox',
      schemaVersion: 1,
      exportedAt: '2026-11-18T00:00:00.000Z',
      data: {
        'wpt-consent': 'all',
        unknown_key: '<script>window.__xss=1</script>',
        wptoolbox_user_snippets: [
          {
            id: 'xss_snip',
            title: XSS_PAYLOAD,
            category: '<svg onload=window.__xss=1>',
            description: XSS_PAYLOAD,
            code: '<script>window.__xss=1</script>',
            language: 'HTML',
          },
        ],
        wptoolbox_checklist_sites: [
          {
            id: 'xss_site',
            name: XSS_PAYLOAD,
            url: 'javascript:window.__xss=1',
            tasks: [
              { id: 't1', title: XSS_PAYLOAD, category: 'SEO', description: XSS_PAYLOAD, completed: false },
            ],
          },
        ],
        wptoolbox_checklist_active_site: 'xss_site',
        wptoolbox_blocksy_palettes: [
          {
            id: 'xss_pal',
            name: XSS_PAYLOAD,
            mode: 'dark',
            colors: ['javascript:window.__xss=1', 'red;background:url(x)', '#abc'],
          },
        ],
        wptoolbox_stacks: [
          {
            id: 'xss_stack',
            name: XSS_PAYLOAD,
            themes: ['blocksy'],
            plugins: [],
          },
        ],
      },
    };

    await page.locator('#mode-replace').check();
    await page.locator('#file-input').setInputFiles({
      name: 'malicious-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(maliciousPayload), 'utf8'),
    });

    const confirmDialog = page.locator('dialog.wpt-dialog[open]');
    await expect(confirmDialog).toBeVisible();

    await Promise.all([
      page.waitForEvent('load'),
      confirmDialog.locator('button[value="confirm"]').click(),
    ]);
    await page.waitForFunction(() => window.App?.isReady === true);

    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(await page.evaluate(() => localStorage.getItem('wpt-consent'))).toBe('denied');
    expect(await page.evaluate(() => localStorage.getItem('unknown_key'))).toBeNull();

    // Visit every tool that renders restored data and verify XSS never executes
    await page.goto('/snippets.html');
    await page.waitForFunction(() => window.App?.isReady === true);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('#snippets-container')).toContainText(XSS_PAYLOAD);

    await page.goto('/checklist.html');
    await page.waitForFunction(() => window.App?.isReady === true);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('#sites-list')).toContainText(XSS_PAYLOAD);
    await expect(page.locator('#active-site-url-wrap a')).toHaveCount(0);

    await page.goto('/blocksy-palette.html');
    await page.waitForFunction(() => window.App?.isReady === true);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('#saved-palettes-list')).toContainText(XSS_PAYLOAD);

    await page.goto('/awesomestack.html');
    await page.waitForFunction(() => window.App?.isReady === true);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('#saved-stacks-container')).toContainText(XSS_PAYLOAD);

    const { consoleErrors, pageErrors, cspViolations } = await monitor.getErrors();
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(cspViolations).toEqual([]);
  });

  test('rejects invalid backup JSON with visible live-region error', async ({ page }) => {
    const monitor = await attachHermeticMonitoring(page);

    await page.goto('/backup.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await page.locator('#file-input').setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ app: 'WrongApp', schemaVersion: 1, data: {} }), 'utf8'),
    });

    await expect(page.locator('#backup-status')).toBeVisible();
    await expect(page.locator('#backup-status')).toContainText(/valid WPToolbox backup/i);

    const { consoleErrors, pageErrors, cspViolations } = await monitor.getErrors();
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(cspViolations).toEqual([]);
  });
});
