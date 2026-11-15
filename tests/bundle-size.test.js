import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const distDir = join(rootDir, 'dist');
const distAssetsDir = join(distDir, 'assets');
const hasDistAssets = existsSync(distAssetsDir);

const KIB = 1024;
const MAX_MAIN_CHUNK_BYTES = 80 * KIB;
const MAX_PAGE_ENTRY_BYTES = 40 * KIB;
const MAX_ANY_CHUNK_BYTES = 120 * KIB;
const MAX_INITIAL_PAGE_BYTES = 150 * KIB;

function extractPageAssetRefs(html) {
  const entries = new Set();
  const preloads = new Set();

  for (const match of html.matchAll(/<script\b([^>]*)>/gi)) {
    const attrs = match[1];
    if (!/\btype\s*=\s*["']?module["']?/i.test(attrs)) continue;
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (/^(?:\.?\/)?assets\/[^"']+\.js$/i.test(src)) {
      entries.add(basename(src));
    }
  }

  for (const match of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = match[1];
    if (!/\brel\s*=\s*["']?modulepreload["']?/i.test(attrs)) continue;
    const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    if (/^(?:\.?\/)?assets\/[^"']+\.js$/i.test(href)) {
      preloads.add(basename(href));
    }
  }

  return { entries: [...entries], preloads: [...preloads] };
}

describe.runIf(hasDistAssets)('JS bundle size budget (dist/)', () => {
  const jsChunks = hasDistAssets
    ? readdirSync(distAssetsDir)
        .filter((file) => file.endsWith('.js'))
        .map((file) => ({
          file,
          bytes: statSync(join(distAssetsDir, file)).size,
        }))
    : [];

  const chunkSizes = new Map(jsChunks.map((c) => [c.file, c.bytes]));

  const htmlPages = hasDistAssets
    ? readdirSync(distDir)
        .filter((file) => file.endsWith('.html'))
        .sort()
        .map((page) => {
          const html = readFileSync(join(distDir, page), 'utf8');
          const { entries, preloads } = extractPageAssetRefs(html);
          const initialFiles = [...new Set([...entries, ...preloads])];
          return { page, entries, preloads, initialFiles };
        })
    : [];

  it('shared main-*.js entry chunk is at most 80 KiB raw', () => {
    const mainChunks = jsChunks.filter((c) => /^main-.*\.js$/.test(c.file));
    expect(mainChunks).toHaveLength(1);
    expect(mainChunks[0].bytes).toBeLessThanOrEqual(MAX_MAIN_CHUNK_BYTES);
  });

  it('each per-page entry chunk is at most 40 KiB raw', () => {
    expect(htmlPages.length).toBeGreaterThan(0);

    const violations = [];
    for (const { page, entries } of htmlPages) {
      expect(entries.length, `${page} should declare a module entry script`).toBeGreaterThan(0);
      for (const file of entries) {
        const bytes = chunkSizes.get(file);
        expect(bytes, `Missing chunk ${file} referenced by ${page}`).toBeTypeOf('number');
        if (bytes > MAX_PAGE_ENTRY_BYTES) {
          violations.push(`${page} (${file}): ${(bytes / KIB).toFixed(2)} KiB`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('no single JS chunk exceeds 120 KiB raw', () => {
    expect(jsChunks.length).toBeGreaterThan(0);

    const oversized = jsChunks
      .filter((c) => c.bytes > MAX_ANY_CHUNK_BYTES)
      .map((c) => `${c.file}: ${(c.bytes / KIB).toFixed(2)} KiB`);

    expect(oversized).toEqual([]);
  });

  it('initial JS per page (entry + modulepreload static imports) is at most 150 KiB raw', () => {
    expect(htmlPages.length).toBeGreaterThan(0);

    const oversized = [];
    for (const { page, initialFiles } of htmlPages) {
      let totalBytes = 0;
      for (const file of initialFiles) {
        const bytes = chunkSizes.get(file);
        expect(bytes, `Missing chunk ${file} preloaded/imported by ${page}`).toBeTypeOf('number');
        totalBytes += bytes;
      }
      if (totalBytes > MAX_INITIAL_PAGE_BYTES) {
        oversized.push(`${page}: ${(totalBytes / KIB).toFixed(2)} KiB (${initialFiles.join(', ')})`);
      }
    }

    expect(oversized).toEqual([]);
  });
});
