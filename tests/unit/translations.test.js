import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..', '..');
const translations = JSON.parse(
  readFileSync(join(rootDir, 'src/data/translations.json'), 'utf8')
);
const nav = JSON.parse(
  readFileSync(join(rootDir, 'src/data/nav.json'), 'utf8')
);

function walkJsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Translations integrity', () => {
  const en = translations.en || {};
  const ar = translations.ar || {};

  it('loads non-empty en and ar dictionaries', () => {
    expect(Object.keys(en).length).toBeGreaterThan(0);
    expect(Object.keys(ar).length).toBeGreaterThan(0);
  });

  it('contains no empty or whitespace-only values in en or ar', () => {
    const emptyEn = Object.entries(en)
      .filter(([, val]) => typeof val !== 'string' || !val.trim())
      .map(([k]) => k);
    const emptyAr = Object.entries(ar)
      .filter(([, val]) => typeof val !== 'string' || !val.trim())
      .map(([k]) => k);

    expect(emptyEn).toEqual([]);
    expect(emptyAr).toEqual([]);
  });

  it('covers all nav.json group titles and item labels/descriptions in both en and ar', () => {
    const missing = [];
    for (const group of nav) {
      if (group.title && (!(group.title in en) || !(group.title in ar))) {
        missing.push(group.title);
      }
      for (const item of group.items || []) {
        for (const key of [item.text, item.desc]) {
          if (key && (!(key in en) || !(key in ar))) {
            missing.push(key);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('every key in en exists in ar and vice versa', () => {
    const enKeys = Object.keys(en);
    const arKeys = Object.keys(ar);

    const missingInAr = enKeys.filter((k) => !(k in ar));
    const missingInEn = arKeys.filter((k) => !(k in en));

    expect(missingInAr).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it('every data-i18n*="key" in root *.html exists in en and ar', () => {
    const htmlFiles = readdirSync(rootDir).filter((f) => f.endsWith('.html'));
    const missing = [];

    for (const file of htmlFiles) {
      const content = readFileSync(join(rootDir, file), 'utf8');
      for (const match of content.matchAll(/data-i18n(?:-html|-placeholder)?=["']([^"']+)["']/g)) {
        const key = match[1];
        if (!(key in en)) missing.push(`${file} [en]: ${key}`);
        if (!(key in ar)) missing.push(`${file} [ar]: ${key}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('every I18n.t("key") / App.t("key") literal in src/ exists in en and ar', () => {
    const jsFiles = walkJsFiles(join(rootDir, 'src'));
    const missing = [];

    for (const filePath of jsFiles) {
      const content = readFileSync(filePath, 'utf8');
      for (const match of content.matchAll(/(?:App|I18n)\.t\(\s*['"]([a-zA-Z0-9_.-]+)['"]\s*\)/g)) {
        const key = match[1];
        if (!(key in en)) missing.push(`${filePath} [en]: ${key}`);
        if (!(key in ar)) missing.push(`${filePath} [ar]: ${key}`);
      }
    }

    expect(missing).toEqual([]);
  });
});
