/**
 * JSON to CSV Converter Module
 */
const JSONConverter = {
    state: {
        csvContent: "",
        currentFilename: "export.csv"
    },

    elements: {
        dropZone: document.getElementById('drop-zone'),
        fileInput: document.getElementById('file-input'),
        statusBar: document.getElementById('status-bar'),
        statusText: document.getElementById('status-text'),
        statusIcon: document.getElementById('status-icon'),
        downloadBtn: document.getElementById('download-btn'),
        previewSection: document.getElementById('preview-section'),
        previewContent: document.getElementById('csv-preview')
    },

    init: () => {
        if (!JSONConverter.elements.dropZone) return;

        const handleFile = (file) => {
            if (!file.name.toLowerCase().endsWith('.json')) {
                JSONConverter.setStatus("Invalid file type. Please upload a .json file.", "alert-circle", "text-red-600 bg-red-50", false);
                return;
            }

            JSONConverter.state.currentFilename = file.name.replace('.json', '.csv');
            JSONConverter.setStatus(`Processing ${file.name}...`, "loader-2", "text-blue-600 bg-blue-50", false);
            JSONConverter.elements.statusBar.classList.remove('hidden');

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    if (!json.data || !Array.isArray(json.data)) {
                        throw new Error('JSON must contain a top-level "data" array.');
                    }
                    JSONConverter.process(json.data);
                } catch (err) {
                    JSONConverter.setStatus(`Error: ${err.message}`, "alert-circle", "text-red-600 bg-red-50", false);
                }
            };
            reader.onerror = () => JSONConverter.setStatus("Failed to read file.", "alert-circle", "text-red-600 bg-red-50", false);
            reader.readAsText(file);
        };

        JSONConverter.elements.dropZone.onclick = () => JSONConverter.elements.fileInput.click();
        JSONConverter.elements.fileInput.onchange = (e) => e.target.files[0] && handleFile(e.target.files[0]);

        JSONConverter.elements.dropZone.ondragover = (e) => {
            e.preventDefault();
            JSONConverter.elements.dropZone.classList.add('drag-active');
        };
        JSONConverter.elements.dropZone.ondragleave = () => JSONConverter.elements.dropZone.classList.remove('drag-active');
        JSONConverter.elements.dropZone.ondrop = (e) => {
            e.preventDefault();
            JSONConverter.elements.dropZone.classList.remove('drag-active');
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        };

        JSONConverter.elements.downloadBtn.onclick = () => {
            App.downloadFile(JSONConverter.state.csvContent, JSONConverter.state.currentFilename);
        };
    },

    process: (data) => {
        if (data.length === 0) {
            JSONConverter.setStatus("Data array is empty.", "info", "text-zinc-600 bg-zinc-50", false);
            return;
        }

        const headers = Object.keys(data[0]);
        let csv = '\uFEFF' + headers.join(',') + '\n';

        data.forEach(row => {
            const values = headers.map(h => App.escapeCSV(row[h]));
            csv += values.join(',') + '\n';
        });

        JSONConverter.state.csvContent = csv;
        JSONConverter.elements.previewContent.textContent = csv;
        JSONConverter.elements.previewSection.classList.remove('hidden');
        JSONConverter.setStatus(`Found ${data.length} records. Ready for export.`, "check-circle-2", "text-green-600 bg-green-50", true);
    },

    setStatus: (text, icon, iconClasses, ready) => {
        JSONConverter.elements.statusText.textContent = text;
        JSONConverter.elements.statusIcon.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i>`;
        JSONConverter.elements.statusIcon.className = `p-1.5 rounded-lg ${iconClasses}`;
        App.init(); // Refresh icons

        JSONConverter.elements.downloadBtn.disabled = !ready;
        if (ready) {
            JSONConverter.elements.downloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            JSONConverter.elements.downloadBtn.classList.add('shadow-lg');
        } else {
            JSONConverter.elements.downloadBtn.classList.add('opacity-50', 'cursor-not-allowed');
            JSONConverter.elements.downloadBtn.classList.remove('shadow-lg');
        }
    }
};

document.addEventListener('DOMContentLoaded', JSONConverter.init);
