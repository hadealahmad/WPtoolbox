import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

export const HEAD_MARKER = '<!-- wpt:head -->';
export const SITE_BASE_URL = 'https://hadealahmad.github.io/WPtoolbox/';

/**
 * Single source of truth for the site-wide Content Security Policy.
 * To authorize a new GTM tag/pixel/origin, add its origin to the appropriate directive below.
 * Inline <script> SHA-256 hashes are computed automatically from src/build/head.html.
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    '{{INLINE_SCRIPT_HASHES}}',
    'https://www.googletagmanager.com',
    'https://*.googletagmanager.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://www.googletagmanager.com',
  ],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://*.google-analytics.com',
    'https://*.googletagmanager.com',
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com',
    'https://www.google.com',
  ],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'manifest-src': ["'self'"],
};

const INLINE_SCRIPT_RE = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
const MARKER_LINE_RE = /^[ \t]*<!--\s*wpt:head\s*-->/m;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function resolveUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return new URL(pathOrUrl, SITE_BASE_URL).href;
}

export function computeInlineScriptHashes(templateHtml) {
  const hashes = [];
  for (const match of templateHtml.matchAll(INLINE_SCRIPT_RE)) {
    const hash = createHash('sha256').update(match[1], 'utf8').digest('base64');
    hashes.push(`'sha256-${hash}'`);
  }
  if (hashes.length === 0) {
    throw new Error('[wpt-head] Expected at least one inline <script> in src/build/head.html to hash for CSP.');
  }
  return hashes;
}

export function buildCspContent(inlineHashes) {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      const resolvedSources = sources.flatMap((src) =>
        src === '{{INLINE_SCRIPT_HASHES}}' ? inlineHashes : [src]
      );
      return `${directive} ${resolvedSources.join(' ')}`;
    })
    .join('; ');
}

export function renderPageMetaTags(pageFile, page) {
  if (!page || typeof page !== 'object') {
    throw new Error(`[wpt-head] Missing entry for "${pageFile}" in src/data/pages.json.`);
  }
  if (typeof page.title !== 'string' || page.title.trim() === '') {
    throw new Error(`[wpt-head] Missing required "title" for "${pageFile}" in src/data/pages.json.`);
  }
  if (typeof page.description !== 'string' || page.description.trim() === '') {
    throw new Error(`[wpt-head] Missing required "description" for "${pageFile}" in src/data/pages.json.`);
  }

  const ogType = page.ogType || 'website';
  const ogTitle = page.ogTitle || page.title;
  const ogDescription = page.ogDescription || page.description;
  const ogLocale = page.ogLocale || 'en_US';
  const ogLocaleAlt = page.ogLocaleAlternate || 'ar_AR';
  const twitterCard = page.twitterCard || 'summary';
  const twitterTitle = page.twitterTitle || ogTitle;
  const twitterDescription = page.twitterDescription || ogDescription;
  const twitterImage = page.twitterImage || page.ogImage;

  const titleAttr = page.titleI18n ? ` data-i18n="${escapeHtml(page.titleI18n)}"` : '';
  const lines = [
    `    <title${titleAttr}>${escapeHtml(page.title)}</title>`,
    `    <meta name="description" content="${escapeHtml(page.description)}">`,
    '',
    '    <!-- Open Graph / Facebook -->',
    `    <meta property="og:type" content="${escapeHtml(ogType)}">`,
  ];

  if (page.canonicalPath !== undefined || page.ogUrl) {
    const ogUrl = page.ogUrl ? resolveUrl(page.ogUrl) : resolveUrl(page.canonicalPath);
    lines.push(`    <meta property="og:url" content="${escapeHtml(ogUrl)}">`);
  }

  lines.push(
    `    <meta property="og:title" content="${escapeHtml(ogTitle)}">`,
    `    <meta property="og:description" content="${escapeHtml(ogDescription)}">`
  );

  if (page.ogImage) {
    lines.push(`    <meta property="og:image" content="${escapeHtml(resolveUrl(page.ogImage))}">`);
  }

  lines.push(
    `    <meta property="og:locale" content="${escapeHtml(ogLocale)}">`,
    `    <meta property="og:locale:alternate" content="${escapeHtml(ogLocaleAlt)}">`,
    '',
    '    <!-- Twitter -->',
    `    <meta name="twitter:card" content="${escapeHtml(twitterCard)}">`
  );

  if (page.twitterSite) {
    lines.push(`    <meta name="twitter:site" content="${escapeHtml(page.twitterSite)}">`);
  }

  lines.push(
    `    <meta name="twitter:title" content="${escapeHtml(twitterTitle)}">`,
    `    <meta name="twitter:description" content="${escapeHtml(twitterDescription)}">`
  );

  if (twitterImage) {
    lines.push(`    <meta name="twitter:image" content="${escapeHtml(resolveUrl(twitterImage))}">`);
  }

  return lines.join('\n');
}

function loadHeadInputs(templatePath, pagesPath) {
  if (!existsSync(templatePath)) {
    throw new Error(`[wpt-head] Head template not found: ${templatePath}`);
  }
  if (!existsSync(pagesPath)) {
    throw new Error(`[wpt-head] Pages metadata file not found: ${pagesPath}`);
  }

  const templateHtml = readFileSync(templatePath, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  let pages;
  try {
    pages = JSON.parse(readFileSync(pagesPath, 'utf8'));
  } catch (err) {
    throw new Error(`[wpt-head] Failed to parse ${pagesPath}: ${err.message}`);
  }

  const hashes = computeInlineScriptHashes(templateHtml);
  const csp = buildCspContent(hashes);

  return { templateHtml, pages, csp };
}

export function wptHeadPlugin(options = {}) {
  let rootDir = process.cwd();
  let templatePath = '';
  let pagesPath = '';

  return {
    name: 'wpt-head-inject',

    configResolved(config) {
      rootDir = config.root ? resolve(config.root) : process.cwd();
      templatePath = options.templatePath || resolve(rootDir, 'src/build/head.html');
      pagesPath = options.pagesPath || resolve(rootDir, 'src/data/pages.json');
    },

    buildStart() {
      const { pages } = loadHeadInputs(templatePath, pagesPath);
      const htmlFiles = readdirSync(rootDir)
        .filter((file) => file.endsWith('.html'))
        .sort();

      if (htmlFiles.length === 0) {
        throw new Error(`[wpt-head] No root *.html files found in ${rootDir}`);
      }

      for (const file of htmlFiles) {
        const pageHtml = readFileSync(resolve(rootDir, file), 'utf8');
        if (!MARKER_LINE_RE.test(pageHtml)) {
          throw new Error(`[wpt-head] Missing "${HEAD_MARKER}" marker in ${file}.`);
        }
        renderPageMetaTags(file, pages[file]);
      }
    },

    configureServer(server) {
      server.watcher.add([templatePath, pagesPath]);
      server.watcher.on('change', (changedPath) => {
        const resolved = resolve(changedPath);
        if (resolved === templatePath || resolved === pagesPath) {
          server.ws.send({ type: 'full-reload', path: '*' });
        }
      });
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const pageFile = basename(ctx.filename || ctx.path || 'index.html') || 'index.html';
        if (!MARKER_LINE_RE.test(html)) {
          throw new Error(`[wpt-head] Missing "${HEAD_MARKER}" marker in ${pageFile}.`);
        }

        const { templateHtml, pages, csp } = loadHeadInputs(templatePath, pagesPath);
        const metaTags = renderPageMetaTags(pageFile, pages[pageFile]);

        const injectedHead = templateHtml
          .replace('{{CSP}}', () => escapeHtml(csp))
          .replace('{{META_TAGS}}', () => metaTags);

        return html.replace(MARKER_LINE_RE, () => injectedHead);
      },
    },
  };
}

export default wptHeadPlugin;
