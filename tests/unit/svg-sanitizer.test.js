import { describe, it, expect, vi } from 'vitest';
vi.mock('../../src/main.js', () => ({}));
import { sanitizeSVGMarkup, SVGSanitizer } from '../../src/tools/svg-sanitizer.js';

describe('sanitizeSVGMarkup', () => {
  describe('rejects invalid, empty, or non-SVG inputs', () => {
    it.each([
      ['empty string', ''],
      ['whitespace only', '   \n\t  '],
      ['null input', null],
      ['undefined input', undefined],
      ['number input', 123],
      ['malformed XML (parsererror)', '<svg xmlns="http://www.w3.org/2000/svg"><path></svg>'],
      ['HTML root instead of SVG', '<html><body><p>hi</p></body></html>'],
      ['div root instead of SVG', '<div onclick="alert(1)">hello</div>'],
    ])('throws on %s', (_label, input) => {
      expect(() => sanitizeSVGMarkup(input)).toThrow();
    });
  });

  describe('strips dangerous elements', () => {
    it.each([
      ['script element', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0h10v10H0z"/></svg>', 'script'],
      ['foreignObject element', '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="100" height="100"><div xmlns="http://www.w3.org/1999/xhtml">xss</div></foreignObject><circle cx="5" cy="5" r="4"/></svg>', 'foreignobject'],
      ['iframe element', '<svg xmlns="http://www.w3.org/2000/svg"><iframe src="https://evil.example"></iframe><rect width="10" height="10"/></svg>', 'iframe'],
      ['object element', '<svg xmlns="http://www.w3.org/2000/svg"><object data="https://evil.example"></object><rect width="10" height="10"/></svg>', 'object'],
      ['embed element', '<svg xmlns="http://www.w3.org/2000/svg"><embed src="https://evil.example"/><rect width="10" height="10"/></svg>', 'embed'],
      ['disallowed HTML a element', '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>click</text></a><path d="M0 0"/></svg>', 'a'],
    ])('removes %s', (_label, input, forbiddenTag) => {
      const clean = sanitizeSVGMarkup(input);
      expect(clean.toLowerCase()).not.toContain(`<${forbiddenTag}`);
      expect(clean).toContain('<svg');
    });
  });

  describe('strips event handler (on*) attributes', () => {
    it.each([
      ['onload on svg', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path d="M1 1"/></svg>', 'onload'],
      ['onclick on path', '<svg xmlns="http://www.w3.org/2000/svg"><path d="M1 1" onclick="alert(1)"/></svg>', 'onclick'],
      ['onmouseover on rect', '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" onmouseover="fetch(\'https://evil.example\')"/></svg>', 'onmouseover'],
      ['uppercase ONERROR on image', '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,iVBORw0KGgo=" ONERROR="alert(1)"/></svg>', 'onerror'],
    ])('removes %s', (_label, input, attrName) => {
      const clean = sanitizeSVGMarkup(input);
      expect(clean.toLowerCase()).not.toContain(attrName);
      expect(clean.toLowerCase()).not.toContain('alert(');
    });
  });

  describe('sanitizes href and xlink:href attributes', () => {
    it.each([
      ['javascript: href on use', '<svg xmlns="http://www.w3.org/2000/svg"><use href="javascript:alert(1)"/></svg>'],
      ['javascript: xlink:href on use', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="javascript:alert(1)"/></svg>'],
      ['data:text/html href on use', '<svg xmlns="http://www.w3.org/2000/svg"><use href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;"/></svg>'],
      ['external https href on image', '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/track.png"/></svg>'],
      ['data:image/svg+xml href on image', '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml;base64,PHN2Zz4="/></svg>'],
      ['fragment href on feImage? No, external on feImage', '<svg xmlns="http://www.w3.org/2000/svg"><filter id="f"><feImage href="https://evil.example/x.png"/></filter></svg>'],
    ])('strips unsafe %s', (_label, input) => {
      const clean = sanitizeSVGMarkup(input);
      expect(clean.toLowerCase()).not.toContain('javascript:');
      expect(clean.toLowerCase()).not.toContain('data:text');
      expect(clean.toLowerCase()).not.toContain('data:image/svg+xml');
      expect(clean.toLowerCase()).not.toContain('https://evil.example');
    });

    it('preserves safe same-document fragment hrefs and raster data URIs on image', () => {
      const input = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<defs><path id="icon" d="M0 0h10v10H0z"/></defs>' +
        '<use href="#icon"/>' +
        '<use xlink:href="#icon"/>' +
        '<image href="data:image/png;base64,iVBORw0KGgo=" width="10" height="10"/>' +
        '</svg>';
      const clean = sanitizeSVGMarkup(input);
      expect(clean).toContain('href="#icon"');
      expect(clean).toContain('data:image/png;base64,iVBORw0KGgo=');
    });
  });

  describe('blocks dangerous <animate> and <set> targets', () => {
    it.each([
      ['animate targeting href', '<svg xmlns="http://www.w3.org/2000/svg"><use href="#a"><animate attributeName="href" to="javascript:alert(1)"/></use></svg>'],
      ['set targeting xlink:href', '<svg xmlns="http://www.w3.org/2000/svg"><use href="#a"><set attributeName="xlink:href" to="https://evil.example"/></use></svg>'],
      ['animate targeting onclick', '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"><animate attributeName="onclick" to="alert(1)"/></rect></svg>'],
      ['animateTransform with javascript: in values', '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"><animateTransform attributeName="transform" values="javascript:alert(1)"/></rect></svg>'],
      ['set with external url() in to', '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"><set attributeName="fill" to="url(https://evil.example/p)"/></rect></svg>'],
    ])('removes %s', (_label, input) => {
      const clean = sanitizeSVGMarkup(input);
      expect(clean.toLowerCase()).not.toContain('<animate');
      expect(clean.toLowerCase()).not.toContain('<set');
      expect(clean.toLowerCase()).not.toContain('javascript:');
      expect(clean.toLowerCase()).not.toContain('evil.example');
    });

    it('preserves benign animation elements', () => {
      const input = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"><animate attributeName="opacity" from="0" to="1" dur="1s"/></rect></svg>';
      const clean = sanitizeSVGMarkup(input);
      expect(clean).toContain('<animate');
      expect(clean).toContain('attributeName="opacity"');
    });
  });

  describe('sanitizes CSS url() and dangerous directives in style attr and <style>', () => {
    it.each([
      ['external url() in inline style', '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" style="fill: url(https://evil.example/x.svg#a)"/></svg>', 'evil.example'],
      ['data:text in inline style', '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" style="fill: url(data:text/html,xss)"/></svg>', 'data:text'],
      ['javascript: in inline style', '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" style="background: url(javascript:alert(1))"/></svg>', 'javascript:'],
      ['CSS escaped url() in inline style', '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" style="fill: \\75 rl(https://evil.example/x)"/></svg>', 'evil.example'],
      ['external url() inside <style>', '<svg xmlns="http://www.w3.org/2000/svg"><style>path { fill: url(https://evil.example/a); }</style><path d="M0 0"/></svg>', '<style'],
      ['@import inside <style>', '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url("https://evil.example/x.css");</style><path d="M0 0"/></svg>', '<style'],
      ['expression() inside <style>', '<svg xmlns="http://www.w3.org/2000/svg"><style>path { width: expression(alert(1)); }</style><path d="M0 0"/></svg>', '<style'],
    ])('strips %s', (_label, input, forbiddenSnippet) => {
      const clean = sanitizeSVGMarkup(input);
      expect(clean.toLowerCase()).not.toContain(forbiddenSnippet);
    });

    it('keeps safe fragment url(#id) in style attr and <style>', () => {
      const input = '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad1"><stop offset="0%" stop-color="#000"/></linearGradient></defs><style>.p { fill: url(#grad1); }</style><path class="p" style="stroke: url(#grad1)" d="M0 0h10v10H0z"/></svg>';
      const clean = sanitizeSVGMarkup(input);
      expect(clean).toContain('<style>');
      expect(clean).toContain('url(#grad1)');
    });
  });

  describe('preserves normal icons and strips comments/prolog', () => {
    it('keeps valid icon geometry, presentation attributes, and aria-* attributes', () => {
      const input = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
        '<!-- comment -->' +
        '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-label="Check">' +
        '<path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="12" r="10"/>' +
        '</svg>';

      const clean = sanitizeSVGMarkup(input);
      expect(clean).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(clean).toContain('viewBox="0 0 24 24"');
      expect(clean).toContain('aria-label="Check"');
      expect(clean).toContain('<path');
      expect(clean).toContain('d="M20 6L9 17l-5-5"');
      expect(clean).toContain('<circle');
      expect(clean).not.toContain('<?xml');
      expect(clean).not.toContain('<!DOCTYPE');
      expect(clean).not.toContain('<!--');
    });

    it('matches SVGSanitizer.sanitizeSVG public tool wrapper', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>';
      expect(SVGSanitizer.sanitizeSVG(svg)).toBe(sanitizeSVGMarkup(svg));
    });
  });
});
