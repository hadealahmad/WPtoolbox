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
        container.innerHTML = '';

        if (this.currentType === 'search-replace') {
            container.innerHTML = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2" data-i18n="label_search_for">Search For</label>
                        <input type="text" id="sr-old" class="shadcn-input builder-input" placeholder="http://old-domain.com">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2" data-i18n="label_replace_with">Replace With</label>
                        <input type="text" id="sr-new" class="shadcn-input builder-input" placeholder="https://new-domain.com">
                    </div>
                    <label class="flex items-center justify-between cursor-pointer group mt-6">
                        <span class="text-sm font-medium text-zinc-300 group-hover:text-white" data-i18n="opt_dry_run">Dry Run (Testing only)</span>
                        <div class="relative inline-flex items-center">
                            <input type="checkbox" id="sr-dry" class="sr-only peer builder-input" checked>
                            <div class="w-10 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-none"></div>
                        </div>
                    </label>
                    <label class="flex items-center justify-between cursor-pointer group">
                        <span class="text-sm font-medium text-zinc-300 group-hover:text-white" data-i18n="opt_skip_columns">Skip GUID Column</span>
                        <div class="relative inline-flex items-center">
                            <input type="checkbox" id="sr-guid" class="sr-only peer builder-input" checked>
                            <div class="w-10 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-none"></div>
                        </div>
                    </label>
                </div>
            `;
        } else if (this.currentType === 'user-generate') {
            container.innerHTML = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2">Number of Users</label>
                        <input type="number" id="ug-count" class="shadcn-input builder-input" value="10" min="1">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2">Role</label>
                        <div class="relative">
                            <select id="ug-role" class="w-full shadcn-input builder-input appearance-none cursor-pointer">
                                <option value="subscriber">Subscriber</option>
                                <option value="contributor">Contributor</option>
                                <option value="author">Author</option>
                                <option value="editor">Editor</option>
                                <option value="administrator">Administrator</option>
                            </select>
                            <div class="pointer-events-none absolute inset-y-0 end-0 flex items-center px-4 text-zinc-400">
                                <i data-lucide="chevron-down" class="w-4 h-4"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (this.currentType === 'db-export') {
            container.innerHTML = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2">Filename (optional)</label>
                        <input type="text" id="db-file" class="shadcn-input builder-input" placeholder="backup.sql">
                    </div>
                    <label class="flex items-center justify-between cursor-pointer group mt-6">
                        <span class="text-sm font-medium text-zinc-300 group-hover:text-white">Add DROP TABLE</span>
                        <div class="relative inline-flex items-center">
                            <input type="checkbox" id="db-drop" class="sr-only peer builder-input">
                            <div class="w-10 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-none"></div>
                        </div>
                    </label>
                </div>
            `;
        } else if (this.currentType === 'media-regen') {
            container.innerHTML = `
                <div class="space-y-4">
                    <label class="flex items-center justify-between cursor-pointer group">
                        <span class="text-sm font-medium text-zinc-300 group-hover:text-white">Skip previously regenerated</span>
                        <div class="relative inline-flex items-center">
                            <input type="checkbox" id="mr-skip" class="sr-only peer builder-input" checked>
                            <div class="w-10 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-none"></div>
                        </div>
                    </label>
                    <label class="flex items-center justify-between cursor-pointer group">
                        <span class="text-sm font-medium text-zinc-300 group-hover:text-white">Only regenerate missing sizes</span>
                        <div class="relative inline-flex items-center">
                            <input type="checkbox" id="mr-missing" class="sr-only peer builder-input">
                            <div class="w-10 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-none"></div>
                        </div>
                    </label>
                </div>
            `;
        }

        // Translate the new DOM content if App.isReady
        if (App.isReady && App.translatePage) {
            App.translatePage();
        }

        // Attach listeners to new inputs
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
