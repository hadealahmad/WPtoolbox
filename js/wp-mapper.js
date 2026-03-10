let mapper;

const WPMapper = {
    sourceData: [],
    headers: [],
    mappings: {},
    targetFormat: 'xml',
    authors: [],
    filters: { unmapped: false, wp: false },
    markdownMode: false,
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

    init: () => {
        mapper = App.registerTool('WPMapper', {
            onFile: (file) => WPMapper.handleFile(file),
            onLanguageChange: () => {
                if (WPMapper.headers.length > 0) WPMapper.renderMappingTable();
            }
        });

        const generateBtn = document.getElementById('generate-btn');
        const downloadBtn = document.getElementById('download-btn');

        if (generateBtn) generateBtn.onclick = () => WPMapper.generate();
        if (downloadBtn) downloadBtn.onclick = () => WPMapper.download();

        WPMapper.setTargetFormat('xml');
    },

    setTargetFormat: (format) => {
        WPMapper.targetFormat = format;
        ['xml', 'csv', 'json'].forEach(f => {
            const btn = document.getElementById(`target-${f}-btn`);
            if (btn) {
                if (f === format) {
                    btn.className = "py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all bg-primary/20 border border-primary/50 text-white shadow-sm";
                } else {
                    btn.className = "py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all border border-transparent text-zinc-500 hover:text-zinc-300";
                }
            }
        });

        const markdownSettings = document.getElementById('markdown-settings');
        if (markdownSettings) {
            if (format === 'xml') markdownSettings.classList.add('hidden');
            else markdownSettings.classList.remove('hidden');
        }

        const genBtnText = document.getElementById('generate-btn-text');
        if (genBtnText) genBtnText.textContent = `${App.t('btn_generate')} ${format.toUpperCase()}`;

        if (WPMapper.headers.length > 0) {
            WPMapper.renderMappingTable();
        }
    },

    toggleMarkdown: () => {
        WPMapper.markdownMode = !WPMapper.markdownMode;
        const toggle = document.getElementById('markdown-toggle');
        const knob = document.getElementById('markdown-toggle-knob');
        if (toggle && knob) {
            const isRtl = document.documentElement.dir === 'rtl';
            if (WPMapper.markdownMode) {
                toggle.classList.add('bg-primary');
                toggle.classList.remove('bg-zinc-800');
                knob.classList.add(isRtl ? '-translate-x-5' : 'translate-x-5', 'bg-white');
                knob.classList.remove('bg-zinc-500');
            } else {
                toggle.classList.remove('bg-primary');
                toggle.classList.add('bg-zinc-800');
                knob.classList.remove('translate-x-5', '-translate-x-5', 'bg-white');
                knob.classList.add('bg-zinc-500');
            }
        }
        App.showToast(`Markdown conversion ${WPMapper.markdownMode ? 'enabled' : 'disabled'}`);
    },

    toggleFilter: (id) => {
        WPMapper.filters[id] = !WPMapper.filters[id];
        const btn = document.getElementById(`filter-${id}`);
        if (btn) {
            const base = "px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all";
            if (WPMapper.filters[id]) {
                btn.className = `${base} bg-primary/20 text-white`;
            } else {
                btn.className = `${base} text-zinc-500 hover:text-white`;
            }
        }
        WPMapper.renderMappingTable();
    },

    handleFile: async (file) => {
        if (!file) return;
        const reader = new FileReader();
        const ext = file.name.split('.').pop().toLowerCase();

        mapper.showOverlay("Processing File...", "Reading and parsing data structure.");

        reader.onload = async (e) => {
            const content = e.target.result;
            try {
                if (ext === 'csv') await WPMapper.parseCSV(content);
                else if (ext === 'json') await WPMapper.parseJSON(content);
                else if (ext === 'xml') await WPMapper.parseXML(content);
                else App.showToast("Unsupported format");
            } catch (err) {
                console.error(err);
                App.showToast("Failed to parse file");
            } finally {
                mapper.hideOverlay();
            }
        };
        reader.readAsText(file);
    },

    parseJSON: async (content) => {
        try {
            const data = JSON.parse(content);
            const array = Array.isArray(data) ? data : (data.items || Object.values(data).find(Array.isArray) || []);
            if (!array.length) throw new Error("No data found");
            WPMapper.sourceData = array;
            WPMapper.headers = Object.keys(array[0]);
            WPMapper.mappings = {};
            WPMapper.renderMappingTable();
        } catch (e) {
            App.showToast(App.t('msg_invalid_json'));
        }
    },

    parseCSV: async (content) => {
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length < 2) return;

        const parseLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else current += char;
            }
            result.push(current.trim());
            return result;
        };

        const headers = parseLine(lines[0]);
        const data = await mapper.processInChunks(lines.slice(1), (line) => {
            const values = parseLine(line);
            const obj = {};
            headers.forEach((h, i) => obj[h] = values[i] || "");
            return obj;
        });

        if (!data) return;

        WPMapper.sourceData = data;
        WPMapper.headers = headers;
        WPMapper.mappings = {};
        WPMapper.renderMappingTable();
    },

    parseXML: async (content) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");

        const authors = [];
        const authorNodes = xmlDoc.getElementsByTagName("wp:author");
        for (let i = 0; i < authorNodes.length; i++) {
            const node = authorNodes[i];
            authors.push({
                id: node.getElementsByTagName("wp:author_id")[0]?.textContent || "",
                login: node.getElementsByTagName("wp:author_login")[0]?.textContent || "",
                email: node.getElementsByTagName("wp:author_email")[0]?.textContent || "",
                display_name: node.getElementsByTagName("wp:author_display_name")[0]?.textContent || "",
                first_name: node.getElementsByTagName("wp:author_first_name")[0]?.textContent || "",
                last_name: node.getElementsByTagName("wp:author_last_name")[0]?.textContent || ""
            });
        }
        WPMapper.authors = authors;

        const items = Array.from(xmlDoc.getElementsByTagName("item"));
        if (items.length === 0) {
            App.showToast("No <item> tags found");
            return;
        }

        const headersSet = new Set();
        const data = await mapper.processInChunks(items, (item, i) => {
            const obj = {};
            const children = item.children;
            for (let j = 0; j < children.length; j++) {
                const node = children[j];
                if (node.nodeName === 'wp:postmeta') {
                    const key = node.getElementsByTagName('wp:meta_key')[0]?.textContent;
                    const val = node.getElementsByTagName('wp:meta_value')[0]?.textContent || "";
                    if (key) {
                        const h = `meta:${key}`;
                        obj[h] = val;
                        headersSet.add(h);
                    }
                } else if (node.nodeName === 'category') {
                    const domain = node.getAttribute('domain') || 'category';
                    const val = node.textContent;
                    const h = (domain === 'post_tag') ? 'tags' : ((domain === 'category') ? 'categories' : `tax:${domain}`);
                    if (obj[h]) obj[h] += `, ${val}`;
                    else obj[h] = val;
                    headersSet.add(h);
                } else {
                    obj[node.nodeName] = node.textContent;
                    headersSet.add(node.nodeName);
                }
            }
            if (i === 0 && obj['wp:post_type']) {
                const ptInput = document.getElementById('post-type-input');
                if (ptInput) ptInput.value = obj['wp:post_type'];
            }
            return obj;
        });

        if (!data) return;

        WPMapper.sourceData = data;
        WPMapper.headers = Array.from(headersSet);
        WPMapper.mappings = {};
        WPMapper.renderMappingTable();
    },

    renderMappingTable: () => {
        const body = document.getElementById('mapping-body');
        const step2 = document.getElementById('step-2');
        if (!body || !step2) return;

        const filteredHeaders = WPMapper.headers.filter(header => {
            const h = header.toLowerCase();

            if (!WPMapper.mappings[header]) {
                const isMeta = header.startsWith('meta:');
                const suggested = WPMapper.wpFields.find(f => WPMapper.autoSuggest(header, f.id));
                WPMapper.mappings[header] = {
                    wpField: suggested ? suggested.id : 'ignore',
                    metaKey: isMeta ? header.split(':')[1] : ''
                };
            }

            const mapping = WPMapper.mappings[header];

            if (WPMapper.filters.unmapped) {
                if (mapping.wpField !== 'ignore') return false;
            }

            if (WPMapper.filters.wp) {
                const isWP = h.startsWith('wp:') || h.startsWith('content:') || h.startsWith('dc:') ||
                    h.startsWith('excerpt:') || h.startsWith('meta:') ||
                    ['title', 'link', 'guid', 'pubdate', 'category', 'description', 'categories', 'tags'].includes(h);
                if (!isWP) return false;
            }

            return true;
        });

        body.innerHTML = '';
        filteredHeaders.forEach((header) => {
            const index = WPMapper.headers.indexOf(header);
            const mapping = WPMapper.mappings[header];

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 text-sm font-medium text-white">${header}</td>
                <td class="px-6 py-4">
                    <select onchange="WPMapper.updateMapping('${header}', this.value, ${index})" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-primary">
                        ${WPMapper.wpFields.map(f => `<option value="${f.id}" ${mapping.wpField === f.id ? 'selected' : ''}>${App.t(f.label)}</option>`).join('')}
                    </select>
                </td>
                <td class="px-6 py-4">
                    <input type="text" id="meta-key-${index}" value="${mapping.metaKey || ''}" placeholder="${App.t('label_meta_key')}" class="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary ${mapping.wpField === 'custom' ? '' : 'hidden'}" oninput="WPMapper.updateMetaKey('${header}', this.value)">
                </td>
            `;
            body.appendChild(row);
        });

        step2.classList.remove('hidden');

        const step1 = document.getElementById('step-1');
        if (step1) step1.classList.add('opacity-40');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    autoSuggest: (header, wpId) => {
        const h = header.toLowerCase();
        const isMeta = h.startsWith('meta:');

        if (isMeta) return wpId === 'custom';

        if (wpId === 'title' && (h === 'title' || h.includes('title') || h === 'name' || h === 'post_title')) return true;
        if (wpId === 'content' && (h === 'content' || h === 'content:encoded' || h.includes('body') || h.includes('description'))) return true;
        if (wpId === 'excerpt' && (h === 'excerpt' || h === 'excerpt:encoded')) return true;
        if (wpId === 'slug' && (h === 'slug' || h === 'post_name' || h === 'wp:post_name')) return true;
        if (wpId === 'date' && (h === 'date' || h === 'pubdate' || h === 'wp:post_date' || h.includes('date'))) return true;
        if (wpId === 'status' && (h === 'status' || h === 'wp:status')) return true;
        if (wpId === 'author' && (h === 'author' || h === 'dc:creator' || h.includes('creator'))) return true;
        if (wpId === 'categories' && (h === 'categories' || h === 'category')) return true;
        if (wpId === 'tags' && (h === 'tags' || h === 'post_tag')) return true;
        if (wpId === 'link' && (h === 'link' || h === 'guid')) return true;
        if (wpId === 'attachment_url' && (h === 'attachment_url' || h === 'wp:attachment_url')) return true;
        if (wpId === 'post_type' && (h === 'post_type' || h === 'wp:post_type' || h === 'type')) return true;
        if (wpId === 'password' && (h === 'password' || h === 'wp:post_password')) return true;
        if (wpId === 'is_sticky' && (h === 'is_sticky' || h === 'wp:is_sticky' || h === 'sticky')) return true;
        if (wpId === 'modified' && (h === 'modified' || h === 'wp:post_modified')) return true;
        if (wpId === 'modified_gmt' && (h === 'modified_gmt' || h === 'wp:post_modified_gmt')) return true;
        if (wpId === 'comment_status' && (h === 'comment_status' || h === 'wp:comment_status')) return true;
        if (wpId === 'ping_status' && (h === 'ping_status' || h === 'wp:ping_status')) return true;
        if (wpId === 'post_id' && (h === 'id' || h === 'post_id' || h === 'wp:post_id')) return true;
        if (wpId === 'parent_id' && (h === 'parent' || h === 'wp:post_parent')) return true;
        if (wpId === 'menu_order' && (h === 'menu_order' || h === 'wp:menu_order')) return true;

        return false;
    },

    updateMapping: (header, value, index) => {
        const metaInput = document.getElementById(`meta-key-${index}`);
        if (!WPMapper.mappings[header]) WPMapper.mappings[header] = { wpField: value, metaKey: '' };
        else WPMapper.mappings[header].wpField = value;

        if (value === 'custom') metaInput?.classList.remove('hidden');
        else metaInput?.classList.add('hidden');
    },

    updateMetaKey: (header, value) => {
        if (WPMapper.mappings[header]) WPMapper.mappings[header].metaKey = value;
    },

    generate: async () => {
        mapper.showOverlay();

        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            if (WPMapper.targetFormat === 'xml') await WPMapper.generateXML();
            else if (WPMapper.targetFormat === 'csv') await WPMapper.generateCSV();
            else if (WPMapper.targetFormat === 'json') await WPMapper.generateJSON();
        } catch (e) {
            console.error(e);
            App.showToast("Generation failed");
        } finally {
            mapper.hideOverlay();
        }
    },

    getMappedItem: (row, format = 'json') => {
        const result = format === 'xml' ? { meta: [] } : {};
        Object.keys(WPMapper.mappings).forEach(h => {
            const m = WPMapper.mappings[h];
            if (m.wpField === 'ignore') return;

            let val = row[h];

            if (WPMapper.markdownMode && (m.wpField === 'content' || m.wpField === 'excerpt')) {
                val = App.htmlToMarkdown(val);
            }

            if (m.wpField === 'custom') {
                if (format === 'xml') {
                    if (m.metaKey) result.meta.push({ key: m.metaKey, value: val });
                } else {
                    const fieldName = m.metaKey || h;
                    result[fieldName] = val;
                }
            } else {
                result[m.wpField] = val;
            }
        });
        return result;
    },

    generateJSON: async () => {
        const data = await mapper.processInChunks(WPMapper.sourceData, (row) => WPMapper.getMappedItem(row, 'json'));
        if (!data) return;

        const jsonChunks = ['[\n'];
        for (let i = 0; i < data.length; i++) {
            if (mapper.isCancelled) return;
            jsonChunks.push(JSON.stringify(data[i], null, 2));
            if (i < data.length - 1) jsonChunks.push(',\n');
            if (i % 500 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }
        jsonChunks.push('\n]');

        WPMapper.currentOutput = jsonChunks;
        WPMapper.showPreview(WPMapper.currentOutput, 'JSON');
    },

    generateCSV: async () => {
        const data = await mapper.processInChunks(WPMapper.sourceData, (row) => WPMapper.getMappedItem(row, 'csv'));
        if (!data || !data.length) return;

        const headers = Object.keys(data[0]).filter(h => h !== 'meta');
        const csvRows = [headers.join(',')];

        for (let i = 0; i < data.length; i++) {
            if (mapper.isCancelled) return;
            const row = data[i];
            const values = headers.map(h => App.escapeCSV(row[h]));
            csvRows.push(values.join(','));
            if (i % 500 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }

        WPMapper.currentOutput = csvRows.map(row => row + '\n');
        WPMapper.showPreview(WPMapper.currentOutput, 'CSV');
    },

    generateXML: async () => {
        const postType = document.getElementById('post-type-input').value.trim() || 'post';
        const timestamp = new Date().toUTCString();
        const authorSection = (WPMapper.authors || []).map(a => `
        <wp:author>
            <wp:author_id>${a.id}</wp:author_id>
            <wp:author_login><![CDATA[${a.login}]]></wp:author_login>
            <wp:author_email><![CDATA[${a.email}]]></wp:author_email>
            <wp:author_display_name><![CDATA[${a.display_name}]]></wp:author_display_name>
            <wp:author_first_name><![CDATA[${a.first_name}]]></wp:author_first_name>
            <wp:author_last_name><![CDATA[${a.last_name}]]></wp:author_last_name>
        </wp:author>`).join('');

        const xmlHeader = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
    xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"
    xmlns:wfw="http://wellformedweb.org/CommentAPI/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:wp="http://wordpress.org/export/1.2/"
>
    <channel>
        <title>WPToolbox Export</title>
        <link>https://wptoolbox.app</link>
        <description>Generated by WPToolbox</description>
        <pubDate>${timestamp}</pubDate>
        <language>en-US</language>
        <wp:wxr_version>1.2</wp:wxr_version>
        <wp:base_site_url>https://wptoolbox.app</wp:base_site_url>
        <wp:base_blog_url>https://wptoolbox.app</wp:base_blog_url>
        ${authorSection}`;

        const mappedData = await mapper.processInChunks(WPMapper.sourceData, (row, idx) => {
            const data = WPMapper.getMappedItem(row, 'xml');

            data.title = data.title || '';
            data.content = data.content || '';
            data.excerpt = data.excerpt || '';
            data.date = data.date || '';
            data.slug = data.slug || '';
            data.status = data.status || 'publish';
            data.post_id = data.post_id || (20000 + idx);
            data.parent_id = data.parent_id || 0;
            data.menu_order = data.menu_order || 0;
            data.author = data.author || 'admin';
            data.categories = data.categories || '';
            data.tags = data.tags || '';
            data.link = data.link || '';
            data.attachment_url = data.attachment_url || '';
            data.post_type = data.post_type || postType;
            data.password = data.password || '';
            data.is_sticky = data.is_sticky || '0';
            data.modified = data.modified || '';
            data.modified_gmt = data.modified_gmt || '';
            data.comment_status = data.comment_status || 'open';
            data.ping_status = data.ping_status || 'open';
            data.meta = data.meta || [];

            const itemDate = data.date || new Date().toISOString().slice(0, 19).replace('T', ' ');
            const itemSlug = (data.slug || data.title || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const itemLink = data.link || `https://wptoolbox.app/${itemSlug}/`;

            const cats = (data.categories || '').toString().split(',').map(c => c.trim()).filter(c => c).map(c => `
        <category domain="category" nicename="${c.toLowerCase().replace(/ /g, '-')}"><![CDATA[${c}]]></category>`).join('');
            const tags = (data.tags || '').toString().split(',').map(t => t.trim()).filter(t => t).map(t => `
        <category domain="post_tag" nicename="${t.toLowerCase().replace(/ /g, '-')}"><![CDATA[${t}]]></category>`).join('');

            return `
        <item>
            <title><![CDATA[${data.title}]]></title>
            <link>${itemLink}</link>
            <pubDate>${new Date(itemDate).toUTCString()}</pubDate>
            <dc:creator><![CDATA[${data.author}]]></dc:creator>
            <guid isPermaLink="false">${itemLink}</guid>
            <description></description>
            <content:encoded><![CDATA[${data.content}]]></content:encoded>
            <excerpt:encoded><![CDATA[${data.excerpt}]]></excerpt:encoded>
            ${cats}
            ${tags}
            <wp:post_id>${data.post_id}</wp:post_id>
            <wp:post_date><![CDATA[${itemDate}]]></wp:post_date>
            <wp:post_date_gmt><![CDATA[${itemDate}]]></wp:post_date_gmt>
            <wp:post_modified><![CDATA[${data.modified || itemDate}]]></wp:post_modified>
            <wp:post_modified_gmt><![CDATA[${data.modified_gmt || itemDate}]]></wp:post_modified_gmt>
            <wp:comment_status><![CDATA[${data.comment_status}]]></wp:comment_status>
            <wp:ping_status><![CDATA[${data.ping_status}]]></wp:ping_status>
            <wp:post_name><![CDATA[${itemSlug}]]></wp:post_name>
            <wp:status><![CDATA[${data.status}]]></wp:status>
            <wp:post_parent>${data.parent_id}</wp:post_parent>
            <wp:menu_order>${data.menu_order}</wp:menu_order>
            <wp:post_type><![CDATA[${data.post_type}]]></wp:post_type>
            <wp:post_password><![CDATA[${data.password}]]></wp:post_password>
            ${data.attachment_url ? `<wp:attachment_url><![CDATA[${data.attachment_url}]]></wp:attachment_url>` : ''}
            <wp:is_sticky>${data.is_sticky}</wp:is_sticky>
            ${data.meta.map(m => `
            <wp:postmeta>
                <wp:meta_key><![CDATA[${m.key}]]></wp:meta_key>
                <wp:meta_value><![CDATA[${m.value}]]></wp:meta_value>
            </wp:postmeta>`).join('')}
        </item>`;
        });

        if (mapper.isCancelled || !mappedData) return;

        WPMapper.currentOutput = [xmlHeader, ...mappedData, `</channel></rss>`];
        WPMapper.showPreview(WPMapper.currentOutput, 'XML');
    },

    showPreview: (content, mode) => {
        const previewHeader = document.getElementById('preview-title');
        const previewArea = document.getElementById('xml-preview');
        const downloadText = document.getElementById('download-text');

        if (previewHeader) previewHeader.textContent = `${mode} Preview`;
        if (previewArea) {
            let previewText = '';
            if (Array.isArray(content)) {
                let totalLen = 0;
                for (let i = 0; i < content.length; i++) {
                    const chunk = content[i];
                    if (totalLen + chunk.length > 50000) {
                        previewText += chunk.substring(0, 50000 - totalLen);
                        previewText += "\n\n... (Result truncated for preview, download for full file) ...";
                        break;
                    }
                    previewText += chunk;
                    totalLen += chunk.length;
                    if (i === content.length - 1 && totalLen > 50000) {
                        previewText += "\n\n... (Result truncated for preview, download for full file) ...";
                    }
                }
            } else {
                previewText = content.length > 50000 ? content.substring(0, 50000) + "\n\n... (Result truncated for preview, download for full file) ..." : content;
            }
            previewArea.textContent = previewText;
        }
        if (downloadText) downloadText.textContent = `Download .${mode.toLowerCase()}`;

        document.getElementById('preview-section').classList.remove('hidden');
        App.showToast(`${mode} generated successfully`);
        App.fireConfetti();
    },

    download: () => {
        if (!WPMapper.currentOutput) return;
        const mime = WPMapper.targetFormat === 'json' ? 'application/json' : (WPMapper.targetFormat === 'csv' ? 'text/csv' : 'text/xml');
        App.downloadFile(WPMapper.currentOutput, `wp-export.${WPMapper.targetFormat}`, mime);
        App.fireConfetti();
    },

};

document.addEventListener('DOMContentLoaded', WPMapper.init);
