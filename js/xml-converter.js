/**
 * XML to CSV Converter Module
 */
const XMLConverter = {
    state: {
        csvData: '',
        fileName: 'export.csv'
    },

    elements: {
        dropZone: document.getElementById('drop-zone'),
        fileInput: document.getElementById('file-input'),
        errorMsg: document.getElementById('error-msg'),
        errorText: document.getElementById('error-text'),
        recordCount: document.getElementById('record-count'),
        previewContainer: document.getElementById('preview-container'),
        controls: document.getElementById('controls'),
        previewBody: document.getElementById('preview-body'),
        downloadBtn: document.getElementById('download-btn')
    },

    init: () => {
        if (!XMLConverter.elements.dropZone) return;

        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });

        const handleFile = (file) => {
            XMLConverter.elements.errorMsg.classList.add('hidden');
            if (!file.name.toLowerCase().endsWith('.xml')) {
                XMLConverter.elements.errorText.textContent = "Please upload a valid XML file.";
                XMLConverter.elements.errorMsg.classList.remove('hidden');
                return;
            }

            XMLConverter.state.fileName = file.name.replace('.xml', '.csv');
            const reader = new FileReader();
            reader.onload = (e) => XMLConverter.process(e.target.result, turndownService);
            reader.readAsText(file);
        };

        XMLConverter.elements.dropZone.onclick = () => XMLConverter.elements.fileInput.click();
        XMLConverter.elements.fileInput.onchange = (e) => e.target.files[0] && handleFile(e.target.files[0]);

        XMLConverter.elements.dropZone.ondragover = (e) => {
            e.preventDefault();
            XMLConverter.elements.dropZone.classList.add('drag-active');
        };
        XMLConverter.elements.dropZone.ondragleave = () => XMLConverter.elements.dropZone.classList.remove('drag-active');
        XMLConverter.elements.dropZone.ondrop = (e) => {
            e.preventDefault();
            XMLConverter.elements.dropZone.classList.remove('drag-active');
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        };

        XMLConverter.elements.downloadBtn.onclick = () => {
            App.downloadFile(XMLConverter.state.csvData, XMLConverter.state.fileName);
        };
    },

    process: (text, turndownService) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const items = xmlDoc.getElementsByTagName('item');

            if (items.length === 0) {
                XMLConverter.elements.errorText.textContent = "No posts found in XML.";
                XMLConverter.elements.errorMsg.classList.remove('hidden');
                return;
            }

            const results = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const getText = (tag) => {
                    let el = item.getElementsByTagName(tag)[0];
                    if (!el) {
                        try { el = item.querySelector(tag.replace(':', '\\:')); } catch (e) { }
                    }
                    return el ? el.textContent : '';
                };

                const rawContent = getText('content:encoded');
                const markdown = rawContent ? turndownService.turndown(rawContent.replace(/<!-- \/?wp:.*? -->/g, '')) : '';

                results.push({
                    id: getText('wp:post_id'),
                    title: getText('title'),
                    type: getText('wp:post_type'),
                    content: markdown,
                    date: getText('pubDate')
                });
            }

            XMLConverter.generateCSV(results);
            XMLConverter.renderPreview(results);
        } catch (err) {
            XMLConverter.elements.errorText.textContent = "Error parsing XML.";
            XMLConverter.elements.errorMsg.classList.remove('hidden');
        }
    },

    generateCSV: (results) => {
        const headers = ['ID', 'Title', 'Type', 'Content', 'Date'];
        let csv = '\uFEFF' + headers.join(',') + '\n';
        results.forEach(r => {
            const row = [r.id, r.title, r.type, r.content, r.date];
            csv += row.map(v => App.escapeCSV(v)).join(',') + '\n';
        });
        XMLConverter.state.csvData = csv;
        XMLConverter.elements.recordCount.textContent = results.length;
        XMLConverter.elements.controls.classList.remove('hidden');
        XMLConverter.elements.previewContainer.classList.remove('hidden');
    },

    renderPreview: (results) => {
        XMLConverter.elements.previewBody.innerHTML = '';
        results.slice(0, 5).forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 font-mono text-[10px] text-zinc-400">${r.id}</td>
                <td class="px-6 py-4 font-medium text-zinc-800">${r.title || 'Untitled'}</td>
                <td class="px-6 py-4"><span class="px-2 py-0.5 bg-zinc-100 text-[10px] font-bold rounded uppercase">${r.type}</span></td>
                <td class="px-6 py-4 text-zinc-400 truncate max-w-xs">${r.content.substring(0, 80)}...</td>
                <td class="px-6 py-4 text-right tabular-nums text-zinc-500">${new Date(r.date).toLocaleDateString()}</td>
            `;
            XMLConverter.elements.previewBody.appendChild(tr);
        });
    }
};

document.addEventListener('DOMContentLoaded', XMLConverter.init);
