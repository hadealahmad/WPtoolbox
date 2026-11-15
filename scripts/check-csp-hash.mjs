import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const htmlFiles = readdirSync(rootDir)
  .filter((file) => file.endsWith('.html'))
  .sort();

if (htmlFiles.length === 0) {
  console.error('No root *.html files found.');
  process.exit(1);
}

const markerRe = /<!--\s*wpt:head\s*-->/;
const inlineScriptRe = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
const cspMetaRe = /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=(["'])([\s\S]*?)\1\s*\/?>/i;

let failures = 0;
const observedHashes = new Set();

// 1. Verify head template & pages.json
const headTemplatePath = join(rootDir, 'src', 'build', 'head.html');
const pagesJsonPath = join(rootDir, 'src', 'data', 'pages.json');

if (!existsSync(headTemplatePath)) {
  console.error('[FAIL] Missing src/build/head.html');
  failures++;
} else {
  const tpl = readFileSync(headTemplatePath, 'utf8');
  if (/'sha256-[A-Za-z0-9+/=]+'/.test(tpl)) {
    console.error('[FAIL] src/build/head.html must not contain a hard-coded sha256 hash');
    failures++;
  }
}

let pages = {};
if (!existsSync(pagesJsonPath)) {
  console.error('[FAIL] Missing src/data/pages.json');
  failures++;
} else {
  try {
    pages = JSON.parse(readFileSync(pagesJsonPath, 'utf8'));
  } catch (err) {
    console.error(`[FAIL] Invalid JSON in src/data/pages.json: ${err.message}`);
    failures++;
  }
}

// 2. Verify source root *.html files contain the marker & pages.json entry
for (const file of htmlFiles) {
  const html = readFileSync(join(rootDir, file), 'utf8');
  if (!markerRe.test(html)) {
    console.error(`[FAIL] src/${file}: missing <!-- wpt:head --> marker`);
    failures++;
  }
  if (cspMetaRe.test(html)) {
    console.error(`[FAIL] src/${file}: should not duplicate CSP meta tag (managed by src/build/head-plugin.js)`);
    failures++;
  }
  if (!pages[file]) {
    console.error(`[FAIL] src/${file}: missing entry in src/data/pages.json`);
    failures++;
  }
}

// 3. Verify built dist/*.html files
const distDir = join(rootDir, 'dist');
if (!existsSync(distDir)) {
  console.error("[FAIL] dist/ directory not found. Run 'npm run build' before 'npm run check:csp'.");
  failures++;
} else {
  for (const file of htmlFiles) {
    const filePath = join(distDir, file);
    if (!existsSync(filePath)) {
      console.error(`[FAIL] dist/${file}: built file missing`);
      failures++;
      continue;
    }

    const html = readFileSync(filePath, 'utf8');
    const cspMatch = html.match(cspMetaRe);
    if (!cspMatch) {
      console.error(`[FAIL] dist/${file}: missing <meta http-equiv="Content-Security-Policy">`);
      failures++;
      continue;
    }

    const csp = cspMatch[2];
    const scriptSrcMatch = csp.match(/(?:^|;)\s*script-src\s+([^;]+)/i);
    if (!scriptSrcMatch) {
      console.error(`[FAIL] dist/${file}: CSP missing script-src directive`);
      failures++;
      continue;
    }

    const scriptSrc = scriptSrcMatch[1];
    if (/'unsafe-inline'/i.test(scriptSrc)) {
      console.error(`[FAIL] dist/${file}: script-src must not contain 'unsafe-inline'`);
      failures++;
    }

    const scripts = [...html.matchAll(inlineScriptRe)];
    if (scripts.length === 0) {
      console.error(`[FAIL] dist/${file}: expected inline consent <script>, found none`);
      failures++;
      continue;
    }

    for (const [idx, match] of scripts.entries()) {
      const hash = `sha256-${createHash('sha256').update(match[1], 'utf8').digest('base64')}`;
      observedHashes.add(hash);
      if (!scriptSrc.includes(`'${hash}'`)) {
        console.error(`[FAIL] dist/${file} (inline script #${idx + 1}): script-src missing '${hash}'`);
        failures++;
      }
    }
  }
}

if (failures > 0) {
  console.error(`\nCSP check failed with ${failures} error(s).`);
  process.exit(1);
}

console.log(
  `CSP check passed for ${htmlFiles.length} source + dist HTML files: ${[...observedHashes].join(', ')}`
);
