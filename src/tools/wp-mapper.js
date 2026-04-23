/**
 * WordPress Export Mapper Module
 */
import '../main.js';
import { App } from '../core/app.js';

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

        if (generateBtn) generateBtn.onclick = () => this.generate();
        if (downloadBtn) downloadBtn.onclick = () => this.download();
        if (markdownToggle) markdownToggle.onclick = () => this.toggleMarkdown();
        if (filterUnmapped) filterUnmapped.onclick = () => this.toggleFilter('unmapped');
        if (filterWp) filterWp.onclick = () => this.toggleFilter('wp');
        if (cancelBtn) cancelBtn.onclick = () => this.cancelProcessing();

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
        const extension = file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();

        reader.onload = async (e) => {
            const content = e.target.result;
            try {
                if (extension === 'csv') {
                    this.parseCSV(content);
                } else if (extension === 'json') {
                    this.parseJSON(content);
                } else if (extension === 'xml') {
                    this.parseXML(content);
                }
                
                if (this.sourceData.length > 0) {
                    document.getElementById('step-2').classList.remove('hidden');
                    this.renderMappingTable();
                    App.showToast(App.t('msg_file_loaded') || 'File loaded successfully.');
                }
            } catch (err) {
                console.error(err);
                App.showToast(App.t('msg_file_error') || 'Error parsing file.');
            }
        };

        reader.readAsText(file);
    },

    parseCSV: function(csv) {
        const lines = csv.split('\n');
        if (lines.length < 2) return;

        this.headers = lines[0].split(',').map(h => h.trim());
        this.sourceData = lines.slice(1).filter(l => l.trim()).map(line => {
            const values = line.split(',');
            const obj = {};
            this.headers.forEach((h, i) => {
                obj[h] = values[i] ? values[i].trim() : '';
            });
            return obj;
        });

        this.autoMap();
    },

    parseJSON: function(json) {
        const data = JSON.parse(json);
        this.sourceData = Array.isArray(data) ? data : [data];
        if (this.sourceData.length > 0) {
            this.headers = Object.keys(this.sourceData[0]);
            this.autoMap();
        }
    },

    parseXML: function(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const items = xmlDoc.querySelectorAll('item') || xmlDoc.querySelectorAll('post') || xmlDoc.children[0].children;
        
        this.sourceData = Array.from(items).map(item => {
            const obj = {};
            Array.from(item.children).forEach(child => {
                obj[child.tagName] = child.textContent;
            });
            return obj;
        });

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

        tbody.innerHTML = '';
        this.headers.forEach(header => {
            const mapping = this.mappings[header] || { type: 'ignore' };
            
            if (this.filters.unmapped && mapping.type !== 'ignore') return;
            if (this.filters.wp && !this.wpFields.find(f => f.id === mapping.type && f.id !== 'ignore' && f.id !== 'custom')) return;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4">
                    <span class="text-sm font-bold text-white">${header}</span>
                    <p class="text-[10px] text-zinc-600 truncate max-w-[200px]">${this.sourceData[0][header] || 'null'}</p>
                </td>
                <td class="px-6 py-4">
                    <select class="mapping-select w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all">
                        ${this.wpFields.map(f => `<option value="${f.id}" ${mapping.type === f.id ? 'selected' : ''}>${App.t(f.label)}</option>`).join('')}
                    </select>
                </td>
                <td class="px-6 py-4">
                    <input type="text" class="meta-input w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-800 focus:outline-none focus:border-primary transition-all ${mapping.type !== 'custom' ? 'opacity-20 pointer-events-none' : ''}" 
                           value="${mapping.metaKey || ''}" placeholder="e.g. price_value">
                </td>
            `;

            const select = tr.querySelector('.mapping-select');
            const metaInput = tr.querySelector('.meta-input');

            select.onchange = (e) => {
                const val = e.target.value;
                this.mappings[header].type = val;
                if (val === 'custom') {
                    metaInput.classList.remove('opacity-20', 'pointer-events-none');
                    metaInput.focus();
                } else {
                    metaInput.classList.add('opacity-20', 'pointer-events-none');
                }
            };

            metaInput.oninput = (e) => {
                this.mappings[header].metaKey = e.target.value;
            };

            tbody.appendChild(tr);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    },

    setFormat: function(format) {
        this.targetFormat = format;
        this.updateFormatUI();
    },

    updateFormatUI: function() {
        ['xml', 'csv', 'json'].forEach(f => {
            const btn = document.getElementById(`target-${f}-btn`);
            if (btn) {
                if (this.targetFormat === f) {
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
        document.getElementById('processing-overlay').classList.add('hidden');
    },

    generate: async function() {
        this.isProcessing = true;
        const overlay = document.getElementById('processing-overlay');
        const progressBar = document.getElementById('progress-bar');
        const progressStatus = document.getElementById('progress-status');
        const processedCount = document.getElementById('processed-count');

        if (overlay) overlay.classList.remove('hidden');

        const total = this.sourceData.length;
        let result = '';

        if (this.targetFormat === 'xml') {
            result = this.generateWXRHeader();
        } else if (this.targetFormat === 'json') {
            result = [];
        } else if (this.targetFormat === 'csv') {
            const mappedHeaders = Object.entries(this.mappings).filter(([k, v]) => v.type !== 'ignore').map(([k, v]) => v.type === 'custom' ? v.metaKey : v.type);
            result = mappedHeaders.join(',') + '\n';
        }

        for (let i = 0; i < total; i++) {
            if (!this.isProcessing) break;

            const item = this.sourceData[i];
            const mappedItem = this.mapItem(item);

            if (this.targetFormat === 'xml') {
                result += this.generateWXRPace(mappedItem, i);
            } else if (this.targetFormat === 'json') {
                result.push(mappedItem);
            } else if (this.targetFormat === 'csv') {
                result += Object.values(mappedItem).join(',') + '\n';
            }

            if (i % 10 === 0 || i === total - 1) {
                const percent = Math.round(((i + 1) / total) * 100);
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressStatus) progressStatus.textContent = `${percent}%`;
                if (processedCount) processedCount.textContent = `${i + 1} / ${total}`;
                await new Promise(r => setTimeout(r, 0));
            }
        }

        if (this.targetFormat === 'xml') {
            result += this.generateWXRFooter();
        } else if (this.targetFormat === 'json') {
            result = JSON.stringify(result, null, 4);
        }

        if (this.isProcessing) {
            this.finalResult = result;
            document.getElementById('xml-preview').textContent = result.substring(0, 5000) + (result.length > 5000 ? '\n\n... (TRUNCATED FOR PREVIEW)' : '');
            document.getElementById('preview-section').classList.remove('hidden');
            document.getElementById('step-2').classList.add('opacity-50', 'pointer-events-none');
            overlay.classList.add('hidden');
            App.fireConfetti();
        }
    },

    mapItem: function(sourceItem) {
        const mapped = {};
        Object.entries(this.mappings).forEach(([sourceHeader, mapping]) => {
            if (mapping.type === 'ignore') return;
            const key = mapping.type === 'custom' ? mapping.metaKey : mapping.type;
            if (!key) return;
            
            let val = sourceItem[sourceHeader] || '';
            if (this.markdownMode && mapping.type === 'content') {
                val = val.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n')
                         .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n')
                         .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n')
                         .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
                         .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                         .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                         .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                         .replace(/<i>(.*?)<\/i>/gi, '*$1*')
                         .replace(/<br\s*\/?>/gi, '\n');
            }
            mapped[key] = val;
        });
        return mapped;
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
        const postType = document.getElementById('post-type-input').value || 'post';
        const date = item.date || new Date().toISOString().replace('T', ' ').substring(0, 19);
        const slug = item.slug || (item.title ? item.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'post-' + index);
        
        let xml = `
    <item>
        <title><![CDATA[${item.title || ''}]]></title>
        <link>http://example.com/${slug}/</link>
        <pubDate>${new Date(date).toUTCString()}</pubDate>
        <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/"><![CDATA[${item.author || 'admin'}]]></dc:creator>
        <guid isPermaLink="false">http://example.com/?p=${1000 + index}</guid>
        <description></description>
        <content:encoded><![CDATA[${item.content || ''}]]></content:encoded>
        <excerpt:encoded><![CDATA[${item.excerpt || ''}]]></excerpt:encoded>
        <wp:post_id>${1000 + index}</wp:post_id>
        <wp:post_date><![CDATA[${date}]]></wp:post_date>
        <wp:post_date_gmt><![CDATA[${date}]]></wp:post_date_gmt>
        <wp:comment_status><![CDATA[${item.comment_status || 'open'}]]></wp:comment_status>
        <wp:ping_status><![CDATA[${item.ping_status || 'open'}]]></wp:ping_status>
        <wp:post_name><![CDATA[${slug}]]></wp:post_name>
        <wp:status><![CDATA[${item.status || 'publish'}]]></wp:status>
        <wp:post_parent>0</wp:post_parent>
        <wp:menu_order>0</wp:menu_order>
        <wp:post_type><![CDATA[${postType}]]></wp:post_type>
        <wp:post_password><![CDATA[${item.password || ''}]]></wp:post_password>
        <wp:is_sticky>0</wp:is_sticky>`;

        Object.entries(item).forEach(([key, val]) => {
            if (!['title', 'content', 'excerpt', 'slug', 'date', 'author', 'status', 'password', 'comment_status', 'ping_status'].includes(key)) {
                xml += `
        <wp:postmeta>
            <wp:meta_key><![CDATA[${key}]]></wp:meta_key>
            <wp:meta_value><![CDATA[${val}]]></wp:meta_value>
        </wp:postmeta>`;
            }
        });

        if (item.categories) {
            const cats = String(item.categories).split(',').map(c => c.trim());
            cats.forEach(c => {
                xml += `
        <category domain="category" nicename="${c.toLowerCase().replace(/ /g, '-')}"><![CDATA[${c}]]></category>`;
            });
        }
        if (item.tags) {
            const tags = String(item.tags).split(',').map(t => t.trim());
            tags.forEach(t => {
                xml += `
        <category domain="post_tag" nicename="${t.toLowerCase().replace(/ /g, '-')}"><![CDATA[${t}]]></category>`;
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
