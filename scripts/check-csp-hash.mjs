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

const inlineScriptRe = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
const cspMetaRe = /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=(["'])([\s\S]*?)\1\s*\/?>/i;

let failures = 0;
const observedHashes = new Set();

function verifyDirectory(dir, label) {
  for (const file of htmlFiles) {
    const filePath = join(dir, file);
    if (!existsSync(filePath)) continue;

    const html = readFileSync(filePath, 'utf8');
    const cspMatch = html.match(cspMetaRe);
    if (!cspMatch) {
      console.error(`[FAIL] ${label}/${file}: missing <meta http-equiv="Content-Security-Policy">`);
      failures++;
      continue;
    }

    const csp = cspMatch[2];
    if (/\bscript-src[^;]*'unsafe-inline'/i.test(csp)) {
      console.error(`[FAIL] ${label}/${file}: script-src must not contain 'unsafe-inline'`);
      failures++;
    }

    const scripts = [...html.matchAll(inlineScriptRe)];
    if (scripts.length === 0) {
      console.error(`[FAIL] ${label}/${file}: expected inline consent <script>, found none`);
      failures++;
      continue;
    }

    for (const [idx, match] of scripts.entries()) {
      const hash = `sha256-${createHash('sha256').update(match[1], 'utf8').digest('base64')}`;
      observedHashes.add(hash);
      if (!csp.includes(`'${hash}'`)) {
        console.error(`[FAIL] ${label}/${file} (inline script #${idx + 1}): CSP missing '${hash}'`);
        failures++;
      }
    }
  }
}

verifyDirectory(rootDir, 'src');

const distDir = join(rootDir, 'dist');
if (existsSync(distDir)) {
  verifyDirectory(distDir, 'dist');
}

if (failures > 0) {
  console.error(`\nCSP hash check failed with ${failures} error(s).`);
  process.exit(1);
}

console.log(
  `CSP hash check passed for ${htmlFiles.length} root HTML files` +
    (existsSync(distDir) ? ' (and dist/)' : '') +
    `: ${[...observedHashes].join(', ')}`
);
