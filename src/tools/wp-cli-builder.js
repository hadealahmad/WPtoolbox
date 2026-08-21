import '../main.js';
import { App } from '../core/app.js';
import { UI } from '../core/ui.js';

export const WPCLIBuilder = App.registerTool('WPCLIBuilder', {
    currentType: 'search-replace',

    onInit: function() {
        this.bindEvents();
        this.renderForm();
    },

    bindEvents: function() {
        const typeSelect = document.getElementById('cmd-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.currentType = e.target.value;
                this.renderForm();
            });
        }

        const btnCopy = document.getElementById('btn-copy');
        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                const code = document.getElementById('cmd-output').textContent;
                navigator.clipboard.writeText(code).then(() => {
                    UI.showToast(App.t('msg_snippet_saved') || "Command copied!");
                });
            });
        }
    },

    renderForm: function() {
        const container = document.getElementById('form-container');
        if (!container) return;

        container.querySelectorAll('[data-form]').forEach(section => {
            section.classList.toggle('hidden', section.dataset.form !== this.currentType);
        });

        // Attach listeners to inputs
        container.querySelectorAll('.builder-input').forEach(input => {
            input.addEventListener('input', () => this.generateCommand());
            input.addEventListener('change', () => this.generateCommand());
        });

        this.generateCommand();
    },

    generateCommand: function() {
        let cmd = 'wp';

        if (this.currentType === 'search-replace') {
            const oldStr = document.getElementById('sr-old')?.value || 'old';
            const newStr = document.getElementById('sr-new')?.value || 'new';
            const dry = document.getElementById('sr-dry')?.checked;
            const guid = document.getElementById('sr-guid')?.checked;

            cmd += ` search-replace '${oldStr}' '${newStr}'`;
            if (guid) cmd += ` --skip-columns=guid`;
            if (dry) cmd += ` --dry-run`;
            
        } else if (this.currentType === 'user-generate') {
            const count = document.getElementById('ug-count')?.value || 10;
            const role = document.getElementById('ug-role')?.value || 'subscriber';
            cmd += ` user generate --count=${count} --role=${role}`;
            
        } else if (this.currentType === 'db-export') {
            const file = document.getElementById('db-file')?.value;
            const drop = document.getElementById('db-drop')?.checked;
            cmd += ` db export`;
            if (file) cmd += ` ${file}`;
            if (drop) cmd += ` --add-drop-table`;

        } else if (this.currentType === 'media-regen') {
            const skip = document.getElementById('mr-skip')?.checked;
            const missing = document.getElementById('mr-missing')?.checked;
            cmd += ` media regenerate --yes`;
            if (skip) cmd += ` --skip-delete`;
            if (missing) cmd += ` --only-missing`;
        }

        const out = document.getElementById('cmd-output');
        if (out) out.textContent = cmd;
    }
});
