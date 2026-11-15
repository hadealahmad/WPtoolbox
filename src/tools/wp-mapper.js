/**
 * WordPress Export Mapper Module
 */
import '../main.js';
import { App } from '../core/app.js';

const SUPPORTS_CLOSEDBY = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

function attachBackdropDismiss(dialog, card, onDismiss) {
    if (!dialog || !card || SUPPORTS_CLOSEDBY) return;
    let startedOutside = false;
    const isOutside = (e) => {
        const r = card.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    dialog.addEventListener('pointerdown', (e) => {
        startedOutside = e.target === dialog && isOutside(e);
    });
    dialog.addEventListener('pointerup', (e) => {
        if (startedOutside && e.target === dialog && isOutside(e)) onDismiss();
        startedOutside = false;
    });
}

function parseCSVRows(csvText) {
    let text = String(csvText || '');
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let atFieldStart = true;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
        } else if (ch === '"' && atFieldStart) {
            inQuotes = true;
            atFieldStart = false;
        } else if (ch === ',') {
            row.push(field.trim());
            field = '';
            atFieldStart = true;
        } else if (ch === '\n') {
            row.push(field.trim());
            if (row.length > 1 || row[0] !== '') {
                rows.push(row);
            }
            row = [];
            field = '';
            atFieldStart = true;
        } else {
            field += ch;
            atFieldStart = false;
        }
    }

    if (field !== '' || row.length > 0) {
        row.push(field.trim());
        if (row.length > 1 || row[0] !== '') {
            rows.push(row);
        }
    }

    return rows;
}

export const WPMapper = App.registerTool('WPMapper', {
    sourceData: [],
    headers: [],
    mappings: {},
    targetFormat: 'xml',
    authors: [],
    filters: { unmapped: false, wp: false },
    markdownMode: false,
    isProcessing: false,
    wpFields: [
        { id: 'ignore', label: 'label_ignore' },
        { id: 'title', label: 'label_title' },
        { id: 'content', label: 'label_content' },
        { id: 'excerpt', label: 'label_excerpt' },
        { id: 'slug', label: 'label_slug' },
        { id: 'date', label: 'label_date' },
        { id: 'status', label: 'label_status' },
        { id: 'author', label: 'label_author' },
        { id: 'categories', label: 'label_categories' },
        { id: 'tags', label: 'label_tags' },
        { id: 'custom', label: 'label_custom_field' },
        { id: 'featured_image', label: 'label_featured_image' },
        { id: 'attachment_url', label: 'label_attachment_url' },
        { id: 'post_type', label: 'label_post_type' },
        { id: 'password', label: 'label_password' },
        { id: 'is_sticky', label: 'label_is_sticky' },
        { id: 'modified', label: 'label_modified' },
        { id: 'modified_gmt', label: 'label_modified_gmt' },
        { id: 'comment_status', label: 'label_comment_status' },
        { id: 'ping_status', label: 'label_ping_status' },
        { id: 'post_id', label: 'label_post_id' },
        { id: 'parent_id', label: 'label_parent_id' },
        { id: 'menu_order', label: 'label_menu_order' }
    ],

    onInit: function() {
        const generateBtn = document.getElementById('generate-btn');
        const downloadBtn = document.getElementById('download-btn');
        const formatBtns = ['xml', 'csv', 'json'];
        const markdownToggle = document.getElementById('markdown-toggle');
        const filterUnmapped = document.getElementById('filter-unmapped');
        const filterWp = document.getElementById('filter-wp');
        const cancelBtn = document.getElementById('cancel-processing-btn');
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');

        if (generateBtn) generateBtn.onclick = () => this.generate();
        if (downloadBtn) downloadBtn.onclick = () => this.download();
        if (markdownToggle) markdownToggle.onclick = () => this.toggleMarkdown();
        if (filterUnmapped) filterUnmapped.onclick = () => this.toggleFilter('unmapped');
        if (filterWp) filterWp.onclick = () => this.toggleFilter('wp');
        if (cancelBtn) cancelBtn.onclick = () => this.cancelProcessing();

        if (dropZone && fileInput) {
            dropZone.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInput.click();
                }
            });
        }

        const overlay = document.getElementById('processing-overlay');
        const overlayCard = document.getElementById('processing-overlay-card');
        if (overlay) {
            attachBackdropDismiss(overlay, overlayCard, () => this.cancelProcessing());
            overlay.addEventListener('close', () => {
                this.isProcessing = false;
            });
        }

        formatBtns.forEach(f => {
            const el = document.getElementById(`target-${f}-btn`);
            if (el) el.onclick = () => this.setFormat(f);
        });

        this.updateFormatUI();
    },

    onFile: function(file) {
        this.handleFile(file);
    },

    handleFile: async function(file) {
        const extension = (file.name.split('.').pop() || '').toLowerCase();
        const reader = new FileReader();

        reader.onload = async (e) => {
            const content = e.target.result;
            this.sourceData = [];
            this.headers = [];
            try {
                if (extension === 'csv') {
                    this.parseCSV(content);
                } else if (extension === 'json') {
                    this.parseJSON(content);
                } else if (extension === 'xml') {
                    this.parseXML(content);
                }

                if (this.sourceData.length > 0) {
                    const step2 = document.getElementById('step-2');
                    if (step2) {
                        step2.classList.remove('hidden', 'opacity-50', 'pointer-events-none');
                    }
                    this.renderMappingTable();
                    App.showToast(App.t('msg_file_loaded') || 'File loaded successfully.', 'success');
                } else {
                    App.showToast(App.t('msg_no_items_xml') || 'No items found in file.', 'error');
                }
            } catch (err) {
                console.error(err);
                App.showToast(App.t('msg_file_error') || 'Error parsing file.', 'error');
            }
        };

        reader.onerror = () => {
            App.showToast(App.t('msg_file_error') || 'Error reading file.', 'error');
        };

        reader.readAsText(file);
    },

    parseCSV: function(csv) {
        const rows = parseCSVRows(csv);
        if (rows.length < 2) return;

        this.headers = rows[0].filter(Boolean);
        this.sourceData = rows.slice(1).map(values => {
            const obj = {};
            this.headers.forEach((h, i) => {
                obj[h] = values[i] !== undefined ? values[i] : '';
            });
            return obj;
        });

        this.autoMap();
    },

    parseJSON: function(json) {
        const data = JSON.parse(json);
        const list = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);
        this.sourceData = list.filter(item => item && typeof item === 'object');
        if (this.sourceData.length > 0) {
            this.headers = Object.keys(this.sourceData[0]);
            this.autoMap();
        }
    },

    parseXML: function(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('Invalid XML document');
        }

        let items = xmlDoc.querySelectorAll('item');
        if (!items.length) items = xmlDoc.querySelectorAll('post');
        if (!items.length && xmlDoc.children[0]) items = xmlDoc.children[0].children;

        this.sourceData = Array.from(items).map(item => {
            const obj = {};
            Array.from(item.children).forEach(child => {
                obj[child.tagName] = child.textContent;
            });
            return obj;
        }).filter(obj => Object.keys(obj).length > 0);

        if (this.sourceData.length > 0) {
            this.headers = Object.keys(this.sourceData[0]);
            this.autoMap();
        }
    },

    autoMap: function() {
        this.mappings = {};
        const commonMappings = {
            'title': 'title',
            'post_title': 'title',
            'content': 'content',
            'post_content': 'content',
            'excerpt': 'excerpt',
            'post_excerpt': 'excerpt',
            'slug': 'slug',
            'post_name': 'slug',
            'date': 'date',
            'post_date': 'date',
            'category': 'categories',
            'categories': 'categories',
            'tag': 'tags',
            'tags': 'tags',
            'author': 'author'
        };

        this.headers.forEach(h => {
            const normalized = h.toLowerCase().replace(/[^a-z]/g, '');
            if (commonMappings[normalized]) {
                this.mappings[h] = { type: commonMappings[normalized] };
            } else {
                this.mappings[h] = { type: 'ignore' };
            }
        });
    },

    renderMappingTable: function() {
        const tbody = document.getElementById('mapping-body');
        if (!tbody) return;

        const rows = [];
        this.headers.forEach(header => {
            const mapping = this.mappings[header] || { type: 'ignore' };

            if (this.filters.unmapped && mapping.type !== 'ignore') return;
            if (this.filters.wp && !this.wpFields.find(f => f.id === mapping.type && f.id !== 'ignore' && f.id !== 'custom')) return;

            const sampleVal = this.sourceData[0]?.[header];
            const sampleText = sampleVal !== undefined && sampleVal !== null && sampleVal !== '' ? String(sampleVal) : 'null';

            const metaInput = App.h('input', {
                type: 'text',
                value: mapping.metaKey || '',
                placeholder: 'e.g. price_value',
                attrs: { 'aria-label': `${App.t('label_meta_key') || 'Meta Key'}: ${header}` },
                class: `meta-input w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-800 focus:outline-none focus:border-primary transition-all ${mapping.type !== 'custom' ? 'opacity-20 pointer-events-none' : ''}`,
                on: {
                    input: (e) => {
                        this.mappings[header].metaKey = e.target.value;
                    }
                }
            });
            metaInput.disabled = mapping.type !== 'custom';

            const select = App.h(
                'select',
                {
                    attrs: { 'aria-label': `${App.t('label_wp_field') || 'WP Field'}: ${header}` },
                    class: 'mapping-select w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all',
                    on: {
                        change: (e) => {
                            const val = e.target.value;
                            this.mappings[header].type = val;
                            if (val === 'custom') {
                                metaInput.disabled = false;
                                metaInput.classList.remove('opacity-20', 'pointer-events-none');
                                metaInput.focus();
                            } else {
                                metaInput.disabled = true;
                                metaInput.classList.add('opacity-20', 'pointer-events-none');
                            }
                        }
                    }
                },
                this.wpFields.map(f => {
                    const opt = App.h('option', { value: f.id, text: App.t(f.label) });
                    if (mapping.type === f.id) opt.selected = true;
                    return opt;
                })
            );

            rows.push(
                App.h(
                    'tr',
                    {},
                    App.h(
                        'td',
                        { class: 'px-6 py-4' },
                        App.h('span', { class: 'text-sm font-bold text-white', text: header }),
                        App.h('p', { class: 'text-[10px] text-zinc-600 truncate max-w-[200px]', text: sampleText })
                    ),
                    App.h('td', { class: 'px-6 py-4' }, select),
                    App.h('td', { class: 'px-6 py-4' }, metaInput)
                )
            );
        });

        tbody.replaceChildren(...rows);
    },

    setFormat: function(format) {
        this.targetFormat = format;
        this.updateFormatUI();
    },

    updateFormatUI: function() {
        ['xml', 'csv', 'json'].forEach(f => {
            const btn = document.getElementById(`target-${f}-btn`);
            if (btn) {
                const isActive = this.targetFormat === f;
                btn.setAttribute('aria-pressed', String(isActive));
                if (isActive) {
                    btn.classList.add('bg-zinc-900', 'text-white', 'border-zinc-700', 'shadow-sm');
                    btn.classList.remove('text-zinc-600', 'border-transparent');
                } else {
                    btn.classList.remove('bg-zinc-900', 'text-white', 'border-zinc-700', 'shadow-sm');
                    btn.classList.add('text-zinc-600', 'border-transparent');
                }
            }
        });

        const markdownSettings = document.getElementById('markdown-settings');
        if (markdownSettings) {
            if (this.targetFormat === 'xml') markdownSettings.classList.remove('hidden');
            else markdownSettings.classList.add('hidden');
        }
    },

    toggleMarkdown: function() {
        this.markdownMode = !this.markdownMode;
        const knob = document.getElementById('markdown-toggle-knob');
        const btn = document.getElementById('markdown-toggle');
        if (knob && btn) {
            btn.setAttribute('aria-checked', String(this.markdownMode));
            if (this.markdownMode) {
                btn.classList.add('bg-primary', 'border-primary');
                knob.classList.add('translate-x-5', 'bg-white');
                knob.classList.remove('translate-x-0', 'bg-zinc-500');
            } else {
                btn.classList.remove('bg-primary', 'border-primary');
                knob.classList.remove('translate-x-5', 'bg-white');
                knob.classList.add('translate-x-0', 'bg-zinc-500');
            }
        }
    },

    toggleFilter: function(type) {
        this.filters[type] = !this.filters[type];
        const btn = document.getElementById(`filter-${type}`);
        if (btn) {
            btn.setAttribute('aria-pressed', String(this.filters[type]));
            if (this.filters[type]) {
                btn.classList.add('bg-zinc-900', 'text-primary');
                btn.classList.remove('text-zinc-500');
            } else {
                btn.classList.remove('bg-zinc-900', 'text-primary');
                btn.classList.add('text-zinc-500');
            }
        }
        this.renderMappingTable();
    },

    cancelProcessing: function() {
        this.isProcessing = false;
        const overlay = document.getElementById('processing-overlay');
        if (overlay && overlay.open) overlay.close();
    },

    generate: async function() {
        this.isProcessing = true;
        const overlay = document.getElementById('processing-overlay');
        const progressBar = document.getElementById('progress-bar');
        const progressStatus = document.getElementById('progress-status');
        const processedCount = document.getElementById('processed-count');

        if (overlay && !overlay.open) overlay.showModal();

        const total = this.sourceData.length;
        let result = '';
        let mappedHeaders = [];

        if (this.targetFormat === 'xml') {
            result = this.generateWXRHeader();
        } else if (this.targetFormat === 'json') {
            result = [];
        } else if (this.targetFormat === 'csv') {
            mappedHeaders = Object.entries(this.mappings)
                .filter(([, v]) => v.type !== 'ignore')
                .map(([, v]) => (v.type === 'custom' ? v.metaKey : v.type))
                .filter(Boolean);
            result = mappedHeaders.map(h => App.escapeCSV(h)).join(',') + '\n';
        }

        const maybeYield = App.createYielder(50);

        for (let i = 0; i < total; i++) {
            if (!this.isProcessing) break;

            const item = this.sourceData[i];
            const mappedItem = this.mapItem(item);

            if (this.targetFormat === 'xml') {
                result += this.generateWXRPace(mappedItem, i);
            } else if (this.targetFormat === 'json') {
                result.push(mappedItem);
            } else if (this.targetFormat === 'csv') {
                result += mappedHeaders.map(h => App.escapeCSV(mappedItem[h] ?? '')).join(',') + '\n';
            }

            if (i % 10 === 0 || i === total - 1) {
                const percent = Math.round(((i + 1) / total) * 100);
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressStatus) progressStatus.textContent = `${percent}%`;
                if (processedCount) processedCount.textContent = `${i + 1} / ${total}`;
            }

            await maybeYield();
        }

        if (this.targetFormat === 'xml') {
            result += this.generateWXRFooter();
        } else if (this.targetFormat === 'json') {
            result = JSON.stringify(result, null, 4);
        }

        if (this.isProcessing) {
            this.finalResult = result;
            const xmlPreview = document.getElementById('xml-preview');
            if (xmlPreview) {
                xmlPreview.textContent = result.substring(0, 5000) + (result.length > 5000 ? '\n\n... (TRUNCATED FOR PREVIEW)' : '');
            }
            document.getElementById('preview-section')?.classList.remove('hidden');
            document.getElementById('step-2')?.classList.add('opacity-50', 'pointer-events-none');
            if (overlay && overlay.open) overlay.close();
            this.isProcessing = false;
            App.fireConfetti();
        }
    },

    mapItem: function(sourceItem) {
        const mapped = {};
        Object.entries(this.mappings).forEach(([sourceHeader, mapping]) => {
            if (mapping.type === 'ignore') return;
            const key = mapping.type === 'custom' ? mapping.metaKey : mapping.type;
            if (!key) return;

            let val = sourceItem[sourceHeader] ?? '';
            if (this.markdownMode && mapping.type === 'content') {
                val = App.htmlToMarkdown(val);
            }
            mapped[key] = val;
        });
        return mapped;
    },

    escapeCData: function(str) {
        return String(str ?? '').replace(/\]\]>/g, ']]]]><![CDATA[>');
    },

    generateWXRHeader: function() {
        return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
    xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"
    xmlns:wpe="http://wordpress.org/export/1.2/"
    xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
    <title>WPToolbox Export</title>
    <link>https://wptoolbox.app</link>
    <description>Generated by WPToolbox WordPress Export Mapper</description>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <language>en-US</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    <wp:base_site_url>http://example.com</wp:base_site_url>
    <wp:base_blog_url>http://example.com</wp:base_blog_url>`;
    },

    generateWXRFooter: function() {
        return `\n</channel>\n</rss>`;
    },

    generateWXRPace: function(item, index) {
        const postType = document.getElementById('post-type-input')?.value.trim() || 'post';
        const date = item.date || new Date().toISOString().replace('T', ' ').substring(0, 19);
        const parsedDate = new Date(date);
        const pubDate = isNaN(parsedDate.getTime()) ? new Date().toUTCString() : parsedDate.toUTCString();
        const rawSlug = item.slug || (item.title ? String(item.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '') || ('post-' + index);
        const safeAttrSlug = App.escapeHtml(rawSlug);
        const c = (v) => this.escapeCData(v);

        let xml = `
    <item>
        <title><![CDATA[${c(item.title || '')}]]></title>
        <link>http://example.com/${safeAttrSlug}/</link>
        <pubDate>${pubDate}</pubDate>
        <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/"><![CDATA[${c(item.author || 'admin')}]]></dc:creator>
        <guid isPermaLink="false">http://example.com/?p=${1000 + index}</guid>
        <description></description>
        <content:encoded><![CDATA[${c(item.content || '')}]]></content:encoded>
        <excerpt:encoded><![CDATA[${c(item.excerpt || '')}]]></excerpt:encoded>
        <wp:post_id>${1000 + index}</wp:post_id>
        <wp:post_date><![CDATA[${c(date)}]]></wp:post_date>
        <wp:post_date_gmt><![CDATA[${c(date)}]]></wp:post_date_gmt>
        <wp:comment_status><![CDATA[${c(item.comment_status || 'open')}]]></wp:comment_status>
        <wp:ping_status><![CDATA[${c(item.ping_status || 'open')}]]></wp:ping_status>
        <wp:post_name><![CDATA[${c(rawSlug)}]]></wp:post_name>
        <wp:status><![CDATA[${c(item.status || 'publish')}]]></wp:status>
        <wp:post_parent>0</wp:post_parent>
        <wp:menu_order>0</wp:menu_order>
        <wp:post_type><![CDATA[${c(postType)}]]></wp:post_type>
        <wp:post_password><![CDATA[${c(item.password || '')}]]></wp:post_password>
        <wp:is_sticky>0</wp:is_sticky>`;

        Object.entries(item).forEach(([key, val]) => {
            if (!['title', 'content', 'excerpt', 'slug', 'date', 'author', 'status', 'password', 'comment_status', 'ping_status', 'categories', 'tags'].includes(key)) {
                xml += `
        <wp:postmeta>
            <wp:meta_key><![CDATA[${c(key)}]]></wp:meta_key>
            <wp:meta_value><![CDATA[${c(val)}]]></wp:meta_value>
        </wp:postmeta>`;
            }
        });

        if (item.categories) {
            const cats = String(item.categories).split(',').map(s => s.trim()).filter(Boolean);
            cats.forEach(cat => {
                const nicename = App.escapeHtml(cat.toLowerCase().replace(/\s+/g, '-'));
                xml += `
        <category domain="category" nicename="${nicename}"><![CDATA[${c(cat)}]]></category>`;
            });
        }
        if (item.tags) {
            const tags = String(item.tags).split(',').map(s => s.trim()).filter(Boolean);
            tags.forEach(tag => {
                const nicename = App.escapeHtml(tag.toLowerCase().replace(/\s+/g, '-'));
                xml += `
        <category domain="post_tag" nicename="${nicename}"><![CDATA[${c(tag)}]]></category>`;
            });
        }

        xml += `
    </item>`;
        return xml;
    },

    download: function() {
        if (!this.finalResult) return;
        const ext = this.targetFormat;
        const mime = ext === 'xml' ? 'text/xml' : (ext === 'json' ? 'application/json' : 'text/csv');
        App.downloadFile(this.finalResult, `wordpress-export.${ext}`, mime);
    }
});
