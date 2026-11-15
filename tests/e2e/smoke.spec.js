import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { attachHermeticMonitoring } from './helpers.js';

const rootDir = process.cwd();
const htmlPages = readdirSync(rootDir)
  .filter((file) => file.endsWith('.html'))
  .sort();

test.describe('All root pages smoke checks', () => {
  for (const pageFile of htmlPages) {
    test(`${pageFile}: clean load, zero CSP/console errors, icons rendered, consent Reject persists`, async ({ page }) => {
      const monitor = await attachHermeticMonitoring(page);

      await page.goto(`/${pageFile}`);
      await page.waitForFunction(() => window.App?.isReady === true);

      // No unrendered <i data-lucide="..."> placeholders should remain after boot
      const unrenderedIcons = await page.locator('i[data-lucide]').count();
      expect(unrenderedIcons, `Unrendered i[data-lucide] found on ${pageFile}`).toBe(0);

      // Consent banner shows on fresh load and "Reject" hides & persists it
      const rejectBtn = page.locator('wpt-consent button[data-consent-level="denied"]');
      await expect(rejectBtn).toBeVisible();
      await rejectBtn.click();

      await expect(page.locator('wpt-consent [role="region"]')).toHaveCount(0);
      const storedConsent = await page.evaluate(() => localStorage.getItem('wpt-consent'));
      expect(storedConsent).toBe('denied');

      await page.reload();
      await page.waitForFunction(() => window.App?.isReady === true);
      await expect(page.locator('wpt-consent [role="region"]')).toHaveCount(0);

      const { consoleErrors, pageErrors, cspViolations } = await monitor.getErrors();
      expect(consoleErrors, `Console errors on ${pageFile}`).toEqual([]);
      expect(pageErrors, `Page errors on ${pageFile}`).toEqual([]);
      expect(cspViolations, `CSP violations on ${pageFile}`).toEqual([]);
    });
  }
});

test('Command palette opens with Ctrl+K and closes with Escape', async ({ page }) => {
  const monitor = await attachHermeticMonitoring(page);

  await page.goto('/index.html');
  await page.waitForFunction(() => window.App?.isReady === true);

  const palette = page.locator('#cmd-palette');
  await expect(palette).not.toHaveAttribute('open', '');

  await page.keyboard.press('Control+k');
  await expect(palette).toHaveAttribute('open', '');
  await expect(page.locator('#cmd-search')).toBeFocused();
  await expect(page.locator('#cmd-results a').first()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(palette).not.toHaveAttribute('open', '');

  const { consoleErrors, pageErrors, cspViolations } = await monitor.getErrors();
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(cspViolations).toEqual([]);
});
