import { deflateSync } from 'node:zlib';

const BLOCKED_EXTERNAL_RE =
  /(^https?:\/\/)?([^/]+\.)?(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)(\/|$)/i;

/**
 * Installs hermetic network route blocking for GTM/GA/Google Fonts and collects
 * console errors, uncaught pageerrors, and securitypolicyviolation events.
 */
export async function attachHermeticMonitoring(page) {
  const consoleErrors = [];
  const pageErrors = [];

  await page.context().route('**/*', (route) => {
    const url = route.request().url();
    if (BLOCKED_EXTERNAL_RE.test(url)) {
      return route.abort();
    }
    return route.continue();
  });

  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__cspViolations.push({
        violatedDirective: e.violatedDirective,
        effectiveDirective: e.effectiveDirective,
        blockedURI: e.blockedURI,
        sourceFile: e.sourceFile,
      });
    });
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const locUrl = msg.location()?.url || '';
    const text = msg.text();
    // Chromium emits ERR_FAILED console errors specifically for routes we intentionally aborted.
    if (BLOCKED_EXTERNAL_RE.test(locUrl) && /ERR_FAILED/i.test(text)) {
      return;
    }
    consoleErrors.push(`${text}${locUrl ? ` (${locUrl})` : ''}`);
  });

  return {
    getErrors: async () => {
      const cspViolations = await page.evaluate(() => window.__cspViolations || []);
      return { consoleErrors, pageErrors, cspViolations };
    },
  };
}

/**
 * Creates a minimal valid RGBA PNG buffer in pure Node for file-upload E2E tests.
 */
export function createSolidPngBuffer(width = 16, height = 16, rgba = [40, 114, 250, 255]) {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = 1 + width * 4;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      raw[px] = rgba[0];
      raw[px + 1] = rgba[1];
      raw[px + 2] = rgba[2];
      raw[px + 3] = rgba[3];
    }
  }

  const idat = deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
