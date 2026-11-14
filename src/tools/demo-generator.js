/**
 * Demo Content Generator Logic
 * Tool to generate mock data for WordPress (XML/WXR), CSV, and JSON.
 */
import '../main.js';
import { App } from '../core/app.js';
import { createIcons, icons } from 'lucide';

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

export const DemoGenerator = App.registerTool('DemoGenerator', {
    fields: [
        { id: 'post_title', type: 'sentence', mapping: 'title', locked: false },
        { id: 'post_content', type: 'paragraphs', mapping: 'content', locked: false },
        { id: 'featured_image', type: 'image', mapping: 'featured_image', locked: false },
        { id: 'category', type: 'category', mapping: 'category', locked: false },
        { id: 'tag', type: 'tag', mapping: 'tag', locked: false }
    ],
    generatedContent: '',
    genLang: 'en',
    outputFormat: 'xml',
    isProcessing: false,

    onInit() {
        this.renderFields();
        this.setupEventListeners();
        this.updateGenLang('en');
        this.updateFormat('xml');
    },

    setupEventListeners() {
        const modal = document.getElementById('field-modal');
        const modalCard = document.getElementById('field-modal-card');
        if (modal) {
            attachBackdropDismiss(modal, modalCard, () => this.closeModal());
            modal.addEventListener('close', () => this.clearFieldError());
        }

        const overlay = document.getElementById('processing-overlay');
        const overlayCard = document.getElementById('processing-overlay-card');
        if (overlay) {
            attachBackdropDismiss(overlay, overlayCard, () => this.cancelProcessing());
            overlay.addEventListener('close', () => {
                this.isProcessing = false;
            });
        }

        const idInput = document.getElementById('modal-field-id');
        if (idInput) {
            idInput.addEventListener('input', () => this.clearFieldError());
            idInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.confirmAddField();
                }
            });
        }

        // Action Buttons
        const buttons = {
            'lang-en-btn': () => this.updateGenLang('en'),
            'lang-ar-btn': () => this.updateGenLang('ar'),
            'format-xml-btn': () => this.updateFormat('xml'),
            'format-csv-btn': () => this.updateFormat('csv'),
            'format-json-btn': () => this.updateFormat('json'),
            'record-count': (e) => {
                const display = document.getElementById('record-count-display');
                if (display) display.textContent = e.target.value;
            },
            'reset-fields-btn': () => this.resetFields(),
            'add-field-btn': () => this.addField(),
            'generate-btn': () => this.generate(),
            'copy-preview-btn': (e) => this.copyPreview(e),
            'download-btn': () => this.download(),
            'modal-close-btn': () => this.closeModal(),
            'modal-cancel-btn': () => this.closeModal(),
            'modal-confirm-btn': () => this.confirmAddField(),
            'cancel-processing-btn': () => this.cancelProcessing()
        };

        Object.entries(buttons).forEach(([id, handler]) => {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'INPUT' && el.type === 'range') {
                    el.oninput = handler;
                } else {
                    el.onclick = handler;
                }
            }
        });
    },

    updateGenLang(lang) {
        this.genLang = lang;
        this.updateToggleButtonGroup('lang', lang);
    },

    updateFormat(format) {
        this.outputFormat = format;
        this.updateToggleButtonGroup('format', format);
    },

    updateToggleButtonGroup(prefix, activeValue) {
        const buttons = document.querySelectorAll(`[id^="${prefix}-"]`);
        buttons.forEach(btn => {
            const isActive = btn.id === `${prefix}-${activeValue}-btn`;
            btn.setAttribute('aria-pressed', String(isActive));
            if (isActive) {
                btn.classList.add('bg-zinc-900', 'text-white', 'border-zinc-700', 'shadow-sm');
                btn.classList.remove('text-zinc-500', 'border-transparent');
            } else {
                btn.classList.remove('bg-zinc-900', 'text-white', 'border-zinc-700', 'shadow-sm');
                btn.classList.add('text-zinc-500', 'border-transparent');
            }
        });
    },

    renderFields() {
        const tbody = document.getElementById('fields-body');
        if (!tbody) return;

        const rows = this.fields.map((field, index) => {
            const actionCell = field.locked
                ? App.h('i', { attrs: { 'data-lucide': 'lock' }, class: 'w-3.5 h-3.5 text-zinc-800 ms-auto' })
                : App.h(
                    'button',
                    {
                        type: 'button',
                        class: 'delete-field-btn p-1 rounded text-zinc-500 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        dataset: { index },
                        attrs: { 'aria-label': `${App.t('btn_delete') || 'Delete'} ${field.id}` },
                        on: { click: () => this.removeField(index) }
                    },
                    App.h('i', { attrs: { 'data-lucide': 'trash-2' }, class: 'w-4 h-4 pointer-events-none' })
                );

            return App.h(
                'tr',
                { class: 'group hover:bg-zinc-900/30 transition-all border-b border-zinc-900/50' },
                App.h('td', { class: 'px-6 py-4 text-xs font-medium text-white', text: field.id }),
                App.h('td', { class: 'px-6 py-4 text-xs text-zinc-500', text: this.getTypeLabel(field.type) }),
                App.h(
                    'td',
                    { class: 'px-6 py-4' },
                    App.h('span', {
                        class: 'px-2 py-1 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono uppercase',
                        text: field.mapping
                    })
                ),
                App.h('td', { class: 'px-6 py-4 text-right' }, actionCell)
            );
        });

        tbody.replaceChildren(...rows);
        createIcons({ icons, root: tbody });
    },

    getTypeLabel(type) {
        const labels = {
            'name': 'Full Name',
            'email': 'Email Address',
            'sentence': 'Sentence',
            'paragraphs': 'Paragraphs',
            'number': 'Random Number',
            'date': 'Random Date',
            'image': 'Image URL',
            'boolean': 'Boolean (True/False)',
            'color': 'Hex Color',
            'category': 'Category',
            'tag': 'Tag'
        };
        return labels[type] || type;
    },

    clearFieldError() {
        const idInput = document.getElementById('modal-field-id');
        const errEl = document.getElementById('modal-field-id-error');
        if (idInput) idInput.removeAttribute('aria-invalid');
        if (errEl) {
            errEl.textContent = '';
            errEl.classList.add('hidden');
        }
    },

    setFieldError(msg) {
        const idInput = document.getElementById('modal-field-id');
        const errEl = document.getElementById('modal-field-id-error');
        if (idInput) idInput.setAttribute('aria-invalid', 'true');
        if (errEl) {
            errEl.textContent = msg;
            errEl.classList.remove('hidden');
        }
    },

    addField() {
        const modal = document.getElementById('field-modal');
        if (modal && !modal.open) {
            this.clearFieldError();
            modal.showModal();
            document.getElementById('modal-field-id')?.focus();
        }
    },

    closeModal() {
        const modal = document.getElementById('field-modal');
        if (modal && modal.open) modal.close();
    },

    confirmAddField() {
        const idInput = document.getElementById('modal-field-id');
        const typeSelect = document.getElementById('modal-field-type');
        const mappingSelect = document.getElementById('modal-wp-mapping');

        const id = idInput.value.trim().toLowerCase().replace(/\s+/g, '_');
        if (!id) {
            const msg = App.t('msg_field_id_required') || 'Field ID is required.';
            this.setFieldError(msg);
            App.showToast(msg, 'error');
            idInput.focus();
            return;
        }

        if (this.fields.find(f => f.id === id)) {
            const msg = App.t('msg_field_id_exists') || 'Field ID already exists.';
            this.setFieldError(msg);
            App.showToast(msg, 'error');
            idInput.focus();
            return;
        }

        this.fields.push({
            id: id,
            type: typeSelect.value,
            mapping: mappingSelect.value,
            locked: false
        });

        this.renderFields();
        this.closeModal();
        idInput.value = '';
        App.showToast(App.t("msg_field_added") || "Field added successfully", 'success');
    },

    removeField(index) {
        this.fields.splice(index, 1);
        this.renderFields();
        App.showToast(App.t("msg_field_removed") || "Field removed");
    },

    resetFields() {
        this.fields = [
            { id: 'post_title', type: 'sentence', mapping: 'title', locked: false },
            { id: 'post_content', type: 'paragraphs', mapping: 'content', locked: false },
            { id: 'featured_image', type: 'image', mapping: 'featured_image', locked: false },
            { id: 'category', type: 'category', mapping: 'category', locked: false },
            { id: 'tag', type: 'tag', mapping: 'tag', locked: false }
        ];
        this.renderFields();
        App.showToast(App.t("msg_fields_reset") || "Fields reset to defaults");
    },

    cancelProcessing() {
        this.isProcessing = false;
        const overlay = document.getElementById('processing-overlay');
        if (overlay && overlay.open) overlay.close();
    },

    async generate() {
        const countInput = document.getElementById('record-count');
        const postTypeInput = document.getElementById('post-type');
        const count = countInput ? parseInt(countInput.value, 10) || 10 : 10;
        const format = this.outputFormat;
        const postType = postTypeInput ? postTypeInput.value.trim() || 'post' : 'post';

        this.isProcessing = true;
        const overlay = document.getElementById('processing-overlay');
        const progressBar = document.getElementById('progress-bar');
        const progressStatus = document.getElementById('progress-status');
        const processedCount = document.getElementById('processed-count');

        if (overlay && !overlay.open) overlay.showModal();
        if (progressBar) progressBar.style.width = '0%';
        if (progressStatus) progressStatus.textContent = '0%';
        if (processedCount) processedCount.textContent = `0 / ${count}`;

        const records = [];
        const maybeYield = App.createYielder(50);

        for (let i = 0; i < count; i++) {
            if (!this.isProcessing) return;

            const record = {};
            this.fields.forEach(field => {
                record[field.id] = this.generateValue(field.type);
                record[`__mapping_${field.id}`] = field.mapping;
            });
            records.push(record);

            if (i % 10 === 0 || i === count - 1) {
                const percent = Math.round(((i + 1) / count) * 100);
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressStatus) progressStatus.textContent = `${percent}%`;
                if (processedCount) processedCount.textContent = `${i + 1} / ${count}`;
            }

            await maybeYield();
        }

        if (!this.isProcessing) return;

        if (format === 'xml') {
            this.generatedContent = this.exportToXML(records, postType);
        } else if (format === 'csv') {
            this.generatedContent = this.exportToCSV(records);
        } else {
            this.generatedContent = JSON.stringify(records, null, 4);
        }

        const preview = document.getElementById('content-preview');
        const previewSection = document.getElementById('preview-section');
        if (preview) preview.textContent = this.generatedContent;
        if (previewSection) previewSection.classList.remove('hidden');

        if (overlay && overlay.open) overlay.close();
        this.isProcessing = false;
        App.fireConfetti();
        App.showToast(App.t("msg_gen_success") || "Content generated successfully", 'success');
    },

    generateValue(type) {
        const isAr = this.genLang === 'ar';

        const enNames = ['James Smith', 'Mary Johnson', 'John Williams', 'Patricia Brown', 'Robert Jones', 'Jennifer Garcia', 'Michael Miller', 'Linda Davis', 'William Rodriguez', 'Elizabeth Martinez'];
        const arNames = ['هادي الأحمد', 'عمر الطباع', 'أميرة نصر', 'ليلى الحداد', 'سامي بيطار', 'سارة طحان', 'نور صالح', 'زيد منصور', 'مايا بياعة', 'كريم جابر'];

        const enVerbs = ['builds', 'creates', 'optimizes', 'launches', 'scales', 'secures', 'designs', 'refactors', 'deploys'];
        const arVerbs = ['يبني', 'يطور', 'يحسن', 'يطلق', 'يوسع', 'يؤمن', 'يصمم', 'يعيد بناء', 'ينشر'];

        const enNouns = ['WordPress site', 'dynamic app', 'clean code', 'pixel-perfect design', 'secure server', 'fast API', 'e-commerce store', 'user interface'];
        const arNouns = ['موقع ووردبريس', 'تطبيق ذكي', 'كود نظيف', 'تصميم مثالي', 'سيرفر آمن', 'واجهة برمجية', 'متجر إلكتروني', 'واجهة مستخدم'];

        const enCats = ['Technology', 'Lifestyle', 'Development', 'Design', 'Business', 'Travel', 'Food', 'Health'];
        const arCats = ['تكنولوجيا', 'نمط حياة', 'تطوير', 'تصميم', 'أعمال', 'سفر', 'طعام', 'صحة'];

        const enTags = ['wp', 'js', 'css', 'coding', 'webdev', 'minimalism', 'performance', 'security'];
        const arTags = ['ووردبريس', 'برمجة', 'تصميم', 'أداء', 'أمان', 'بساطة', 'تطوير', 'ويب'];

        const unsplashIds = [
            'photo-1501785888041-af3ef285b470', 'photo-1472214103451-9374bd1c798e',
            'photo-1441974231531-c6227db76b6e', 'photo-1470071459604-3b5ec3a7fe05',
            'photo-1469474968028-56623f02e42e', 'photo-1505765050516-f72998ffe3f3',
            'photo-1518173946687-a4c8a9b719f5', 'photo-1447752875215-b2761acb3c5d',
            'photo-1433086566608-574fd9e5d22f', 'photo-1501854140801-50d01674aa3e'
        ];

        const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

        switch (type) {
            case 'name':
                return isAr ? random(arNames) : random(enNames);
            case 'email':
                const name = (isAr ? random(arNames) : random(enNames)).toLowerCase().replace(/\s+/g, '.');
                return `${name}${Math.floor(Math.random() * 99)}@example.com`;
            case 'sentence':
                return isAr ?
                    `${random(arNames)} ${random(arVerbs)} ${random(arNouns)}.` :
                    `${random(enNames)} ${random(enVerbs)} the ${random(enNouns)}.`;
            case 'paragraphs':
                return Array(3).fill(0).map(() => {
                    if (isAr) {
                        return `${random(arNames)} ${random(arVerbs)} ${random(arNouns)}. تم تصميم هذا الـ ${random(arNouns)} ليكون متطوراً وعصرياً. يفضل المطورون ${random(arVerbs)} أدواتهم باستمرار.`;
                    }
                    return `${random(enNames)} ${random(enVerbs)} the ${random(enNouns)}. This ${random(enNouns)} is designed to be ${random(['fast', 'secure', 'reliable', 'modern'])}. Many developers prefer to ${random(enVerbs)} their workflow.`;
                }).join('\n\n');
            case 'number':
                return Math.floor(Math.random() * 10000);
            case 'date':
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 365));
                return date.toISOString().split('T')[0];
            case 'image':
                // 9:16 vertical ratio (e.g., 1080x1920)
                return `https://images.unsplash.com/${random(unsplashIds)}?auto=format&fit=crop&w=1080&h=1920&q=80`;
            case 'boolean':
                return Math.random() > 0.5 ? 'true' : 'false';
            case 'color':
                return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            case 'category':
                return isAr ? random(arCats) : random(enCats);
            case 'tag':
                return isAr ? random(arTags) : random(enTags);
            default:
                return 'Mock Content';
        }
    },

    escapeCData(str) {
        return String(str ?? '').replace(/\]\]>/g, ']]]]><![CDATA[>');
    },

    exportToXML(data, postType) {
        let xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
	xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:wfw="http://wellformedweb.org/CommentAPI/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:wp="http://wordpress.org/export/1.2/"
>
<channel>
	<title>WPToolbox Demo Content</title>
	<link>https://wptoolbox.local</link>
	<description>Generated Mock Content</description>
	<wp:wxr_version>1.2</wp:wxr_version>
	<wp:base_site_url>https://wptoolbox.local</wp:base_site_url>
	<wp:base_blog_url>https://wptoolbox.local</wp:base_blog_url>
`;

        data.forEach((item, index) => {
            const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
            const title = item.post_title || `Demo Post ${index + 1}`;
            const content = item.post_content || 'Demo Content';
            const postId = 1000 + index;
            const attachmentId = 2000 + index;
            let featuredImageUrl = '';

            xml += `
	<item>
		<title><![CDATA[${this.escapeCData(title)}]]></title>
		<link>http://wptoolbox.local/?p=${postId}</link>
		<pubDate>${new Date().toUTCString()}</pubDate>
		<dc:creator><![CDATA[admin]]></dc:creator>
		<description></description>
		<content:encoded><![CDATA[${this.escapeCData(content)}]]></content:encoded>
		<excerpt:encoded><![CDATA[${this.escapeCData(item.excerpt || '')}]]></excerpt:encoded>
		<wp:post_id>${postId}</wp:post_id>
		<wp:post_date><![CDATA[${now}]]></wp:post_date>
		<wp:post_date_gmt><![CDATA[${now}]]></wp:post_date_gmt>
		<wp:comment_status><![CDATA[closed]]></wp:comment_status>
		<wp:ping_status><![CDATA[closed]]></wp:ping_status>
		<wp:post_name><![CDATA[post-${postId}]]></wp:post_name>
		<wp:status><![CDATA[publish]]></wp:status>
		<wp:post_parent>0</wp:post_parent>
		<wp:menu_order>0</wp:menu_order>
		<wp:post_type><![CDATA[${this.escapeCData(postType)}]]></wp:post_type>
		<wp:post_password><![CDATA[]]></wp:post_password>
		<wp:is_sticky>0</wp:is_sticky>`;

            // Add Custom Fields & Default WP Mappings
            Object.keys(item).forEach(key => {
                if (!key.startsWith('__mapping_')) {
                    const mapping = item[`__mapping_${key}`];
                    const value = item[key];

                    if (mapping === 'meta') {
                        xml += `
		<wp:postmeta>
			<wp:meta_key><![CDATA[${this.escapeCData(key)}]]></wp:meta_key>
			<wp:meta_value><![CDATA[${this.escapeCData(value)}]]></wp:meta_value>
		</wp:postmeta>`;
                    } else if (mapping === 'category') {
                        const slug = App.escapeHtml(String(value).toLowerCase().replace(/\s+/g, '-'));
                        xml += `
        <category domain="category" nicename="${slug}"><![CDATA[${this.escapeCData(value)}]]></category>`;
                    } else if (mapping === 'tag') {
                        const slug = App.escapeHtml(String(value).toLowerCase().replace(/\s+/g, '-'));
                        xml += `
        <category domain="post_tag" nicename="${slug}"><![CDATA[${this.escapeCData(value)}]]></category>`;
                    } else if (mapping === 'featured_image') {
                        featuredImageUrl = value;
                        xml += `
		<wp:postmeta>
			<wp:meta_key><![CDATA[_thumbnail_id]]></wp:meta_key>
			<wp:meta_value><![CDATA[${attachmentId}]]></wp:meta_value>
		</wp:postmeta>`;
                    }
                }
            });

            xml += `
	</item>`;

            // Add attachment item if featured image exists
            if (featuredImageUrl) {
                xml += `
	<item>
		<title><![CDATA[Featured Image for Post ${postId}]]></title>
		<link>http://wptoolbox.local/?attachment_id=${attachmentId}</link>
		<pubDate>${new Date().toUTCString()}</pubDate>
		<dc:creator><![CDATA[admin]]></dc:creator>
		<guid isPermaLink="false">${App.escapeHtml(featuredImageUrl)}</guid>
		<description></description>
		<content:encoded><![CDATA[]]></content:encoded>
		<excerpt:encoded><![CDATA[]]></excerpt:encoded>
		<wp:post_id>${attachmentId}</wp:post_id>
		<wp:post_date><![CDATA[${now}]]></wp:post_date>
		<wp:post_date_gmt><![CDATA[${now}]]></wp:post_date_gmt>
		<wp:comment_status><![CDATA[open]]></wp:comment_status>
		<wp:ping_status><![CDATA[closed]]></wp:ping_status>
		<wp:post_name><![CDATA[featured-image-${postId}]]></wp:post_name>
		<wp:status><![CDATA[inherit]]></wp:status>
		<wp:post_parent>${postId}</wp:post_parent>
		<wp:menu_order>0</wp:menu_order>
		<wp:post_type><![CDATA[attachment]]></wp:post_type>
		<wp:post_password><![CDATA[]]></wp:post_password>
		<wp:is_sticky>0</wp:is_sticky>
		<wp:attachment_url><![CDATA[${this.escapeCData(featuredImageUrl)}]]></wp:attachment_url>
	</item>`;
            }
        });

        xml += `
</channel>
</rss>`;
        return xml;
    },

    exportToCSV(data) {
        if (data.length === 0) return '';

        // Filter out mapping properties
        const cleanData = data.map(item => {
            const newItem = {};
            Object.keys(item).forEach(key => {
                if (!key.startsWith('__mapping_')) newItem[key] = item[key];
            });
            return newItem;
        });

        const headers = Object.keys(cleanData[0]);
        const csvRows = [headers.map(h => App.escapeCSV(h)).join(',')];

        cleanData.forEach(item => {
            const values = headers.map(header => App.escapeCSV(item[header]));
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    },

    copyPreview(e) {
        const preview = document.getElementById('content-preview');
        if (preview) {
            App.copyToClipboard(preview.textContent, e.currentTarget || e.target);
        }
    },

    download() {
        const format = this.outputFormat;
        const filename = `demo_content.${format === 'xml' ? 'xml' : format === 'csv' ? 'csv' : 'json'}`;
        const mimeType = format === 'xml' ? 'text/xml' : format === 'csv' ? 'text/csv' : 'application/json';
        App.downloadFile(this.generatedContent, filename, mimeType);
    }
});
