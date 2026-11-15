import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Utils } from '../../src/core/utils.js';
import { I18n } from '../../src/core/i18n.js';
import { State } from '../../src/core/state.js';

describe('Utils', () => {
  describe('escapeCSV', () => {
    it.each([
      ['null', null, ''],
      ['undefined', undefined, ''],
      ['plain text', 'hello world', 'hello world'],
      ['number', 42, '42'],
      ['comma requires quoting', 'hello, world', '"hello, world"'],
      ['double quotes are doubled and quoted', 'say "hi"', '"say ""hi"""'],
      ['newlines replaced with spaces and CR stripped', 'line1\r\nline2\nline3', 'line1 line2 line3'],
      ['combined comma and newline', 'a, b\nc', '"a, b c"'],
    ])('handles %s', (_label, input, expected) => {
      expect(Utils.escapeCSV(input)).toBe(expected);
    });
  });

  describe('escapeHtml', () => {
    it.each([
      ['empty string', '', ''],
      ['null', null, ''],
      ['undefined', undefined, ''],
      ['safe string', 'plain text 123', 'plain text 123'],
      ['all special HTML characters', `<script>alert("xss" & 'test')</script>`, '&lt;script&gt;alert(&quot;xss&quot; &amp; &#039;test&#039;)&lt;/script&gt;'],
    ])('handles %s', (_label, input, expected) => {
      expect(Utils.escapeHtml(input)).toBe(expected);
    });
  });

  describe('htmlToMarkdown', () => {
    it('returns empty string for falsy input', () => {
      expect(Utils.htmlToMarkdown('')).toBe('');
      expect(Utils.htmlToMarkdown(null)).toBe('');
    });

    it('converts headings, paragraphs, emphasis, lists, links, images, and breaks', () => {
      const html = '<h1>Title</h1><h3>Sub</h3><p>Hello <strong>bold</strong> and <em>italic</em> and <b>b</b> and <i>i</i><br>next</p>' +
        '<ul><li>One</li><li>Two</li></ul>' +
        '<p><a href="https://example.com">Link</a> <img src="https://example.com/a.png" alt="pic"></p>' +
        '<div><span>plain</span></div>';

      const md = Utils.htmlToMarkdown(html);
      expect(md).toContain('# Title');
      expect(md).toContain('### Sub');
      expect(md).toContain('**bold**');
      expect(md).toContain('*italic*');
      expect(md).toContain('**b**');
      expect(md).toContain('*i*');
      expect(md).toContain('* One');
      expect(md).toContain('* Two');
      expect(md).toContain('[Link](https://example.com)');
      expect(md).toContain('![image](https://example.com/a.png)');
      expect(md).toContain('plain');
      expect(md).not.toContain('<div>');
      expect(md).not.toContain('<span>');
    });
  });

  describe('formatSize', () => {
    beforeEach(async () => {
      await I18n.loadData();
      State.currentLang = 'en';
    });

    it.each([
      ['negative', -1, ''],
      ['NaN', NaN, ''],
      ['Infinity', Infinity, ''],
      ['non-number string', '1024', ''],
      ['zero', 0, '0 Bytes'],
      ['bytes', 512, '512 Bytes'],
      ['kilobytes', 1024, '1 KB'],
      ['fractional KB', 1536, '1.5 KB'],
      ['megabytes', 1024 * 1024, '1 MB'],
      ['gigabytes', 1024 * 1024 * 1024, '1 GB'],
    ])('formats %s', (_label, input, expected) => {
      expect(Utils.formatSize(input)).toBe(expected);
    });
  });

  describe('createYielder', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('yields only when performance.now() exceeds budgetMs since last yield', async () => {
      let now = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => now);
      const yieldSpy = vi.spyOn(Utils, 'yieldToMain').mockResolvedValue(undefined);

      const maybeYield = Utils.createYielder(50);

      // Under budget (1020 - 1000 = 20 < 50) -> does not yield
      now = 1020;
      await maybeYield();
      expect(yieldSpy).not.toHaveBeenCalled();

      // Reaches budget (1050 - 1000 = 50 >= 50) -> yields and resets lastYield to 1050
      now = 1050;
      await maybeYield();
      expect(yieldSpy).toHaveBeenCalledTimes(1);

      // Immediately after yield, under budget again (1080 - 1050 = 30 < 50) -> does not yield
      now = 1080;
      await maybeYield();
      expect(yieldSpy).toHaveBeenCalledTimes(1);

      // Exceeds budget again (1105 - 1050 = 55 >= 50) -> yields again
      now = 1105;
      await maybeYield();
      expect(yieldSpy).toHaveBeenCalledTimes(2);
    });

    it('yieldToMain falls back to setTimeout when scheduler.yield is unavailable', async () => {
      const origScheduler = globalThis.scheduler;
      globalThis.scheduler = undefined;
      try {
        let resolved = false;
        const p = Utils.yieldToMain().then(() => { resolved = true; });
        expect(resolved).toBe(false);
        await vi.runAllTimersAsync();
        await p;
        expect(resolved).toBe(true);
      } finally {
        globalThis.scheduler = origScheduler;
      }
    });
  });

  describe('h() safe DOM builder', () => {
    it('never parses string children or text prop as HTML', () => {
      const xss = '<img src=x onerror=window.__xss=1><script>alert(1)</script>';
      const el1 = Utils.h('div', {}, xss);
      expect(el1.querySelector('img')).toBeNull();
      expect(el1.querySelector('script')).toBeNull();
      expect(el1.textContent).toBe(xss);

      const el2 = Utils.h('p', { text: xss });
      expect(el2.querySelector('img')).toBeNull();
      expect(el2.textContent).toBe(xss);
    });

    it('ignores innerHTML and outerHTML props for XSS safety', () => {
      const el = Utils.h('div', {
        innerHTML: '<img src=x onerror=alert(1)>',
        outerHTML: '<span>bad</span>',
      });
      expect(el.innerHTML).toBe('');
      expect(el.querySelector('img')).toBeNull();
    });

    it('handles class/className, dataset, attrs, style, events, and nested children', () => {
      const clicked = vi.fn();
      const childNode = document.createElement('em');
      childNode.textContent = 'em';

      const el = Utils.h(
        'button',
        {
          class: ['btn', null, 'btn-primary'],
          dataset: { testId: 'go', empty: null, off: false },
          attrs: { 'aria-pressed': true, hidden: false },
          style: { color: 'red' },
          on: { click: clicked },
        },
        'hello',
        null,
        undefined,
        false,
        [childNode, 123]
      );

      expect(el.className).toBe('btn btn-primary');
      expect(el.dataset.testId).toBe('go');
      expect(el.dataset.empty).toBeUndefined();
      expect(el.getAttribute('aria-pressed')).toBe('true');
      expect(el.hasAttribute('hidden')).toBe(false);
      expect(el.style.color).toBe('red');
      expect(el.textContent).toBe('helloem123');

      el.click();
      expect(clicked).toHaveBeenCalledTimes(1);

      const disabledBtn = Utils.h('button', { attrs: { disabled: true } }, 'Disabled');
      expect(disabledBtn.hasAttribute('disabled')).toBe(true);
    });
  });
});
