import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { attachHermeticMonitoring, createSolidPngBuffer } from './helpers.js';

const XSS_PAYLOAD = '<img src=x onerror=window.__xss=1>';

test.describe('Tool main flows & stored XSS checks', () => {
  test.beforeEach(async ({ page }) => {
    await attachHermeticMonitoring(page);
    await page.addInitScript(() => {
      if (!localStorage.getItem('wpt-consent')) {
        localStorage.setItem('wpt-consent', 'denied');
      }
    });
  });

  test('img2webp converts a generated PNG to WebP and downloads it', async ({ page }) => {
    await page.goto('/img2webp.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    const png = createSolidPngBuffer(24, 24);
    await page.locator('#file-input').setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: png,
    });

    const card = page.locator('#results-grid > *').first();
    await expect(card).toBeVisible();
    await card.hover();

    const dlBtn = card.locator('.btn-download-single');
    await expect(dlBtn).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await dlBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sample.webp');
  });

  test('svg-sanitizer strips malicious SVG payloads and downloads clean SVG', async ({ page }) => {
    await page.goto('/svg-sanitizer.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    const maliciousSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" viewBox="0 0 24 24">',
      '<script>alert(1)</script>',
      '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">bad</div></foreignObject>',
      '<path d="M0 0h24v24H0z" onclick="alert(1)"/>',
      '</svg>',
    ].join('');

    await page.locator('#file-input').setInputFiles({
      name: 'evil-icon.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(maliciousSvg, 'utf8'),
    });

    const card = page.locator('#results-grid > *').first();
    await expect(card).toBeVisible();
    await card.hover();

    const dlBtn = card.locator('.dl-btn');
    await expect(dlBtn).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await dlBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('evil-icon-sanitized.svg');

    const savedPath = await download.path();
    const cleaned = readFileSync(savedPath, 'utf8');
    expect(cleaned).toContain('<path');
    expect(cleaned.toLowerCase()).not.toContain('<script');
    expect(cleaned.toLowerCase()).not.toContain('onload');
    expect(cleaned.toLowerCase()).not.toContain('onclick');
    expect(cleaned.toLowerCase()).not.toContain('foreignobject');
  });

  test('qr-generator generates QR codes and downloads qr-codes.zip', async ({ page }) => {
    await page.goto('/qr-generator.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await page.locator('#links-input').fill('https://example.com');
    await page.locator('#generate-btn').click();

    await expect(page.locator('#results-grid .btn-dl-png')).toHaveCount(1);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download-all-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('qr-codes.zip');
  });

  test('snippets adds a custom snippet and deletes it via App.confirm dialog', async ({ page }) => {
    await page.goto('/snippets.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await page.locator('#add-snippet-btn').click();
    await expect(page.locator('#snippet-modal')).toHaveAttribute('open', '');

    await page.locator('#snippet-title-input').fill('E2E Test Snippet');
    await page.locator('#snippet-category-input').fill('Testing');
    await page.locator('#snippet-description-input').fill('Created during E2E smoke');
    await page.locator('#snippet-code-input').fill('add_action("init", "__return_true");');
    await page.locator('#snippet-language-input').fill('PHP');
    await page.locator('#add-snippet-form button[type="submit"]').click();

    const card = page.locator('.snippet-card', { hasText: 'E2E Test Snippet' });
    await expect(card).toBeVisible();

    await card.locator('.btn-delete').click();
    const confirmDialog = page.locator('dialog.wpt-dialog[open]');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.locator('button[value="confirm"]').click();

    await expect(page.locator('.snippet-card', { hasText: 'E2E Test Snippet' })).toHaveCount(0);
  });

  test('checklist adds a site via dialog and renders its 13 deployment tasks', async ({ page }) => {
    await page.goto('/checklist.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await page.locator('#add-site-btn').click();
    await expect(page.locator('#site-modal')).toHaveAttribute('open', '');

    await page.locator('#site-name-input').fill('Production WP');
    await page.locator('#site-url-input').fill('https://example.org');
    await page.locator('#confirm-add-site-btn').click();

    await expect(page.locator('#checklist-content')).toBeVisible();
    await expect(page.locator('#active-site-name')).toHaveText('Production WP');
    await expect(page.locator('#tasks-container input[type="checkbox"]')).toHaveCount(13);
  });

  test('wp-mapper parses a small CSV and generates WXR preview', async ({ page }) => {
    await page.goto('/wp-mapper.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    const csv = 'title,content,author\n"Hello, WP","Body text",admin\n';
    await page.locator('#file-input').setInputFiles({
      name: 'posts.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf8'),
    });

    await expect(page.locator('#step-2')).toBeVisible();
    await expect(page.locator('#mapping-body tr')).toHaveCount(3);

    await page.locator('#generate-btn').click();
    await expect(page.locator('#preview-section')).toBeVisible();
    const previewText = await page.locator('#xml-preview').textContent();
    expect(previewText).toContain('<rss');
    expect(previewText).toContain('Hello, WP');
  });

  test('demo-generator generates 10 WXR records', async ({ page }) => {
    await page.goto('/demo-generator.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await expect(page.locator('#record-count')).toHaveValue('10');
    await page.locator('#generate-btn').click();

    await expect(page.locator('#preview-section')).toBeVisible();
    const previewText = await page.locator('#content-preview').textContent();
    expect(previewText).toContain('<rss');
    const itemMatches = previewText.match(/<item>/g) || [];
    expect(itemMatches.length).toBeGreaterThanOrEqual(10);
  });

  test('wp-cli-builder and server-config-generator produce non-empty reactive output', async ({ page }) => {
    await page.goto('/wp-cli-builder.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    const cliOut = page.locator('#cmd-output');
    await expect(cliOut).toContainText('wp search-replace');
    await page.locator('#sr-old').fill('https://staging.example');
    await expect(cliOut).toContainText('https://staging.example');

    await page.goto('/server-config-generator.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    const srvOut = page.locator('#code-output');
    await expect(srvOut).toContainText('RewriteEngine On');
    await page.locator('#btn-nginx').click();
    await expect(page.locator('#filename-display')).toHaveText('nginx.conf');
    await expect(srvOut).toContainText('try_files');
  });

  test('unify-aspect-ratio processes an uploaded PNG', async ({ page }) => {
    await page.goto('/unify-aspect-ratio.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    const png = createSolidPngBuffer(32, 16);
    await page.locator('#file-input').setInputFiles({
      name: 'rect.png',
      mimeType: 'image/png',
      buffer: png,
    });

    await expect(page.locator('#results-section')).toBeVisible();
    await expect(page.locator('#results-grid img')).toHaveCount(1);
  });

  test('clearfonts strips font-family declarations', async ({ page }) => {
    await page.goto('/clearfonts.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await page.locator('#input').fill('body { font-family: "Open Sans", sans-serif; color: #fff; }');
    const output = await page.locator('#output').inputValue();
    expect(output).not.toContain('font-family');
    expect(output).toContain('color: #fff;');
  });

  test('blocksy-palette renders swatches and saves a custom palette', async ({ page }) => {
    await page.goto('/blocksy-palette.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await expect(page.locator('#color-details > *')).toHaveCount(8);
    expect(await page.locator('#gradients-container > *').count()).toBeGreaterThan(0);

    await page.locator('#palette-name').fill('E2E Brand');
    await page.locator('#save-palette-btn').click();
    await expect(page.locator('#saved-palettes-list')).toContainText('E2E Brand');
  });

  test('dummy-image-generator renders canvas preview and downloads ZIP', async ({ page }) => {
    await page.goto('/dummy-image-generator.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await expect(page.locator('#preview-canvas')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-generate').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^dummy_images_\d+\.zip$/);
  });

  test('awesomestack generates WP-CLI command and saves a stack via App.prompt', async ({ page }) => {
    await page.goto('/awesomestack.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await expect(page.locator('#command-output')).toContainText('wp ');

    await page.locator('#save-stack-btn').click();
    const promptDialog = page.locator('dialog.wpt-dialog[open]');
    await expect(promptDialog).toBeVisible();
    await promptDialog.locator('input[type="text"]').fill('E2E Starter');
    await promptDialog.locator('button[value="confirm"]').click();

    await expect(page.locator('#saved-stacks-container')).toContainText('E2E Starter');
  });

  test('tips renders tip cards', async ({ page }) => {
    await page.goto('/tips.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    expect(await page.locator('#tips-container article').count()).toBeGreaterThan(0);
  });

  test('stored-XSS payload in snippets does not execute after reload', async ({ page }) => {
    await page.goto('/snippets.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await page.locator('#add-snippet-btn').click();
    await page.locator('#snippet-title-input').fill(XSS_PAYLOAD);
    await page.locator('#snippet-category-input').fill('Security');
    await page.locator('#snippet-description-input').fill(XSS_PAYLOAD);
    await page.locator('#snippet-code-input').fill(XSS_PAYLOAD);
    await page.locator('#snippet-language-input').fill('HTML');
    await page.locator('#add-snippet-form button[type="submit"]').click();

    await page.reload();
    await page.waitForFunction(() => window.App?.isReady === true);

    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('#snippets-container')).toContainText(XSS_PAYLOAD);
  });

  test('stored-XSS payload in checklist does not execute after reload', async ({ page }) => {
    await page.goto('/checklist.html');
    await page.waitForFunction(() => window.App?.isReady === true);

    await page.locator('#add-site-btn').click();
    await page.locator('#site-name-input').fill(XSS_PAYLOAD);
    await page.locator('#site-url-input').fill('https://example.com');
    await page.locator('#confirm-add-site-btn').click();

    await page.reload();
    await page.waitForFunction(() => window.App?.isReady === true);

    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('#sites-list')).toContainText(XSS_PAYLOAD);
  });
});
