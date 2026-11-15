import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/main.js', () => ({}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { I18n } from '../../src/core/i18n.js';
import { WPMapper } from '../../src/tools/wp-mapper.js';
import { DemoGenerator } from '../../src/tools/demo-generator.js';
import {
  BlocksyPalette,
  safeHex,
  sanitizePaletteColors,
  parseColorInput,
} from '../../src/tools/blocksy-palette.js';
import {
  Checklist,
  getSafeHttpUrl,
  sanitizeImportedSites,
} from '../../src/tools/checklist.js';

describe('WPMapper CSV parsing & CDATA escaping', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    WPMapper.sourceData = [];
    WPMapper.headers = [];
    WPMapper.mappings = {};
  });

  it('parses RFC4180 commas, quoted fields, escaped quotes, and CRLF line endings', () => {
    const csv = [
      'title,content,author',
      '"Hello, World","He said ""Hi"" to all",Alice',
      'Second,"Plain content","Bob, Jr."',
    ].join('\r\n');

    WPMapper.parseCSV(csv);

    expect(WPMapper.headers).toEqual(['title', 'content', 'author']);
    expect(WPMapper.sourceData).toEqual([
      { title: 'Hello, World', content: 'He said "Hi" to all', author: 'Alice' },
      { title: 'Second', content: 'Plain content', author: 'Bob, Jr.' },
    ]);
  });

  it('parses RFC4180 quoted fields containing embedded newlines, BOM, and trailing newlines', () => {
    const csv = '\uFEFFtitle,content,note\r\n"Multi","Line 1\nLine 2","Keep ""quotes""\r\nand lines"\r\n"Next","Row, 2",ok\r\n\r\n';
    WPMapper.parseCSV(csv);

    expect(WPMapper.headers).toEqual(['title', 'content', 'note']);
    expect(WPMapper.sourceData).toEqual([
      { title: 'Multi', content: 'Line 1\nLine 2', note: 'Keep "quotes"\nand lines' },
      { title: 'Next', content: 'Row, 2', note: 'ok' },
    ]);
  });

  it('ignores header-only or empty CSV input safely', () => {
    WPMapper.parseCSV('\uFEFFtitle,content\n');
    expect(WPMapper.headers).toEqual([]);
    expect(WPMapper.sourceData).toEqual([]);
  });

  it('splits CDATA closing sequences (]]>) in escapeCData and generateWXRPace', () => {
    expect(WPMapper.escapeCData('foo]]>bar]]>baz')).toBe(
      'foo]]]]><![CDATA[>bar]]]]><![CDATA[>baz'
    );
    expect(WPMapper.escapeCData(null)).toBe('');

    const itemXml = WPMapper.generateWXRPace(
      {
        title: 'Title ]]> break',
        content: 'Body ]]> end',
        slug: 'my-slug" onclick="alert(1)',
        categories: 'News & "Updates"',
      },
      0
    );

    expect(itemXml).toContain('<title><![CDATA[Title ]]]]><![CDATA[> break]]></title>');
    expect(itemXml).toContain('<content:encoded><![CDATA[Body ]]]]><![CDATA[> end]]></content:encoded>');
    expect(itemXml).toContain('http://example.com/my-slug&quot; onclick=&quot;alert(1)/');
    expect(itemXml).toContain('nicename="news-&amp;-&quot;updates&quot;"');
  });
});

describe('DemoGenerator CSV & XML escaping', () => {
  it('splits CDATA closing sequences (]]>) in escapeCData and exportToXML', () => {
    expect(DemoGenerator.escapeCData('test]]>value')).toBe('test]]]]><![CDATA[>value');

    const xml = DemoGenerator.exportToXML(
      [
        {
          post_title: 'Post ]]> One',
          post_content: 'Content ]]> Here',
          category: 'Cat "A" & B',
          __mapping_post_title: 'title',
          __mapping_post_content: 'content',
          __mapping_category: 'category',
        },
      ],
      'post'
    );

    expect(xml).toContain('<title><![CDATA[Post ]]]]><![CDATA[> One]]></title>');
    expect(xml).toContain('<content:encoded><![CDATA[Content ]]]]><![CDATA[> Here]]></content:encoded>');
    expect(xml).toContain('nicename="cat-&quot;a&quot;-&amp;-b"');
  });

  it('strips __mapping_* keys and escapes CSV values via App.escapeCSV', () => {
    const csv = DemoGenerator.exportToCSV([
      {
        post_title: 'Hello, "World"',
        post_content: 'Line 1\nLine 2',
        __mapping_post_title: 'title',
        __mapping_post_content: 'content',
      },
    ]);

    const lines = csv.split('\n');
    expect(lines[0]).toBe('post_title,post_content');
    expect(lines[1]).toBe('"Hello, ""World""",Line 1 Line 2');
  });
});

describe('BlocksyPalette validators (direct exports)', () => {
  it('safeHex handles 3/4/6/8-digit hex, whitespace, invalid hex, and CSS injection', () => {
    expect(safeHex('  #AbC  ')).toBe('#aabbcc');
    expect(safeHex('#1a2b')).toBe('#1a2b');
    expect(safeHex('#FF00AA')).toBe('#ff00aa');
    expect(safeHex('#11223380')).toBe('#112233');
    expect(safeHex('#12', '#000000')).toBe('#000000');
    expect(safeHex('#zzzzzz')).toBe('#2872fa');
    expect(safeHex('2872fa')).toBe('#2872fa');
    expect(safeHex('red;background:url(x)')).toBe('#2872fa');
    expect(safeHex('#fff;background:url(x)')).toBe('#2872fa');
    expect(safeHex('javascript:alert(1)')).toBe('#2872fa');
    expect(safeHex('')).toBe('#2872fa');
  });

  it('sanitizePaletteColors returns 8 sanitized slots with per-slot defaults', () => {
    expect(sanitizePaletteColors(null)).toEqual([
      '#2872fa', '#1559ed', '#3a4f66', '#192a3d', '#e1e8ed', '#f2f5f7', '#fafbfc', '#ffffff',
    ]);
    expect(sanitizePaletteColors(['#0f8', 'red;background:url(x)', '#12345678'])).toEqual([
      '#00ff88',
      '#1559ed',
      '#123456',
      '#192a3d',
      '#e1e8ed',
      '#f2f5f7',
      '#fafbfc',
      '#ffffff',
    ]);
  });

  it('parseColorInput parses valid hex/rgb/hsl and rejects invalid/CSS-injection values', () => {
    expect(parseColorInput(' #0F8 ')).toBe('#00ff88');
    expect(parseColorInput('abc')).toBe('#aabbcc');
    expect(parseColorInput('#FF00AA')).toBe('#ff00aa');
    expect(parseColorInput('112233')).toBe('#112233');
    expect(parseColorInput('rgb(255, 0, 128)')).toBe('#ff0080');
    expect(parseColorInput('hsl(0, 100%, 50%)')).toBe('#ff0000');
    expect(parseColorInput('#1234')).toBeNull();
    expect(parseColorInput('#11223380')).toBeNull();
    expect(parseColorInput('red;background:url(x)')).toBeNull();
    expect(parseColorInput('javascript:alert(1)')).toBeNull();
    expect(parseColorInput('')).toBeNull();
  });
});

describe('BlocksyPalette hex validation (via public surface)', () => {
  beforeEach(async () => {
    await I18n.loadData();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('sanitizes invalid, 3-char, and 8-char hex values when loading saved palettes', () => {
    localStorage.setItem(
      'wptoolbox_blocksy_palettes',
      JSON.stringify([
        {
          id: 'p1',
          name: 'Test',
          mode: 'dark',
          colors: [
            '#abc',
            '#FF00AA',
            '#11223380',
            'javascript:alert(1)',
            '#zzzzzz',
            '#12',
            'not-a-color',
            '',
          ],
        },
      ])
    );

    const saved = BlocksyPalette.getSaved();
    expect(saved).toHaveLength(1);
    expect(saved[0].colors).toEqual([
      '#aabbcc', // expanded 3-char
      '#ff00aa', // lowercased 6-char
      '#112233', // trimmed 8-char alpha
      '#192a3d', // fallback slot 3
      '#e1e8ed', // fallback slot 4
      '#f2f5f7', // fallback slot 5
      '#fafbfc', // fallback slot 6
      '#ffffff', // fallback slot 7
    ]);
  });

  it('returns empty array on corrupted localStorage JSON', () => {
    localStorage.setItem('wptoolbox_blocksy_palettes', '{not-json');
    expect(BlocksyPalette.getSaved()).toEqual([]);
  });

  it('parses valid hex, rgb(), and hsl() inputs and rejects invalid text in onTextInput()', () => {
    document.body.innerHTML = `
      <input id="color1" type="color" value="#2872fa" />
      <input id="color1-hex" type="text" value="#2872fa" />
      <input id="color2" type="color" value="#1559ed" />
      <input id="color2-hex" type="text" value="#1559ed" />
      <input id="auto-generate" type="checkbox" checked />
    `;

    // Valid 3-digit hex
    document.getElementById('color1-hex').value = '#0f8';
    BlocksyPalette.onTextInput(1);
    expect(BlocksyPalette.currentColors[0]).toBe('#00ff88');

    // Valid rgb()
    document.getElementById('color1-hex').value = 'rgb(255, 0, 128)';
    BlocksyPalette.onTextInput(1);
    expect(BlocksyPalette.currentColors[0]).toBe('#ff0080');

    // Invalid string must not inject XSS or change color1 away from last valid picker value
    document.getElementById('color1-hex').value = 'javascript:alert(1)';
    BlocksyPalette.onTextInput(1);
    expect(BlocksyPalette.currentColors[0]).toBe('#ff0080');
  });
});

describe('Checklist validators (direct exports)', () => {
  it('getSafeHttpUrl allows http/https (incl. whitespace & uppercase scheme) and blocks unsafe/relative URLs', () => {
    expect(getSafeHttpUrl('https://example.com/wp')).toBe('https://example.com/wp');
    expect(getSafeHttpUrl('  http://example.com/path?a=1  ')).toBe('http://example.com/path?a=1');
    expect(getSafeHttpUrl('HTTPS://EXAMPLE.COM/Admin')).toBe('https://example.com/Admin');
    expect(getSafeHttpUrl('javascript:alert(1)')).toBe('');
    expect(getSafeHttpUrl('  JAVASCRIPT:alert(1)  ')).toBe('');
    expect(getSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(getSafeHttpUrl('//evil.example.com/path')).toBe('');
    expect(getSafeHttpUrl('ftp://files.example.com')).toBe('');
    expect(getSafeHttpUrl('')).toBe('');
    expect(getSafeHttpUrl(null)).toBe('');
  });

  it('sanitizeImportedSites normalizes sites and tasks arrays safely', () => {
    expect(sanitizeImportedSites(null)).toEqual([]);
    expect(sanitizeImportedSites('not-an-array')).toEqual([]);

    const result = sanitizeImportedSites([
      null,
      'bad',
      {
        id: 'site-1',
        name: 'Client Site',
        url: 'https://client.test',
        tasks: [
          null,
          {
            id: 't-1',
            category: 'SEO',
            title: 'Check robots.txt',
            description: { en: 'Verify rules' },
            completed: 1,
          },
        ],
      },
      {
        tasks: 'invalid',
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'site-1',
      name: 'Client Site',
      url: 'https://client.test',
      tasks: [
        {
          id: 't-1',
          category: { en: 'SEO', ar: 'SEO' },
          title: { en: 'Check robots.txt', ar: 'Check robots.txt' },
          description: { en: 'Verify rules', ar: 'Verify rules' },
          completed: true,
        },
      ],
    });
    expect(result[1].name).toBe('Imported Site');
    expect(result[1].url).toBe('');
    expect(result[1].tasks).toEqual([]);
  });
});

describe('Checklist URL validation (via public surface)', () => {
  beforeEach(async () => {
    await I18n.loadData();
    localStorage.clear();
    Checklist.sites = [];
    Checklist.activeSiteId = null;
    document.body.innerHTML = `
      <div id="sites-list"></div>
      <div id="empty-checklist"></div>
      <div id="checklist-content" class="hidden">
        <h2 id="active-site-name"></h2>
        <div id="active-site-url-wrap"></div>
        <div id="tasks-container"></div>
      </div>
      <span id="active-site-progress"></span>
      <div id="active-site-progress-bar"></div>
      <span id="count-all"></span>
      <span id="count-wp"></span>
      <span id="count-seo"></span>
      <span id="count-woo"></span>
      <dialog id="site-modal">
        <input id="site-name-input" type="text" />
        <input id="site-url-input" type="url" />
      </dialog>
      <div id="toast"><div><span id="toast-msg"></span></div></div>
    `;
  });

  it.each([
    ['javascript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['ftp://files.example.com'],
    ['not a valid url'],
  ])('rejects unsafe or invalid site URL (%s) in confirmAddSite()', (badUrl) => {
    document.getElementById('site-name-input').value = 'My Site';
    document.getElementById('site-url-input').value = badUrl;

    Checklist.confirmAddSite();

    expect(Checklist.sites).toHaveLength(0);
    expect(document.getElementById('toast-msg').textContent).toContain('http://');
  });

  it('accepts valid http/https URLs and empty URL in confirmAddSite()', () => {
    document.getElementById('site-name-input').value = 'HTTPS Site';
    document.getElementById('site-url-input').value = 'https://example.com/wp';
    Checklist.confirmAddSite();

    expect(Checklist.sites).toHaveLength(1);
    expect(Checklist.sites[0].url).toBe('https://example.com/wp');

    document.getElementById('site-name-input').value = 'No URL Site';
    document.getElementById('site-url-input').value = '';
    Checklist.confirmAddSite();

    expect(Checklist.sites).toHaveLength(2);
    expect(Checklist.sites[1].url).toBe('');
  });

  it('does not render an anchor tag for javascript: URLs even if injected into localStorage', () => {
    localStorage.setItem(
      'wptoolbox_checklist_sites',
      JSON.stringify([
        { id: 'evil1', name: 'Evil Site', url: 'javascript:alert(1)', tasks: [] },
      ])
    );
    localStorage.setItem('wptoolbox_checklist_active_site', 'evil1');

    Checklist.loadSites();

    const wrap = document.getElementById('active-site-url-wrap');
    expect(wrap.querySelector('a')).toBeNull();
  });
});
