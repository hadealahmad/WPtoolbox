/**
 * Awesome Stack - Quick WordPress Setup Logic
 */
import '../main.js';
import { App } from '../core/app.js';
import stackConfig from '../data/stack-config.json';

export const AwesomeStack = App.registerTool('AwesomeStack', {
    config: stackConfig,
    savedStacks: [],

    onInit: function() {
        this.renderCheckboxes();
        this.loadSavedStacks();
        this.generateCommand();

        // Listen for options changes
        const activateToggle = document.getElementById('include-activate');
        if (activateToggle) activateToggle.onchange = () => this.generateCommand();
        
        const copyBtn = document.getElementById('copy-btn');
        if (copyBtn) copyBtn.onclick = (e) => App.copyToClipboard(document.getElementById('command-output').textContent, e.currentTarget);
        
        const saveBtn = document.getElementById('save-stack-btn');
        if (saveBtn) saveBtn.onclick = () => this.saveCurrentStack();
        
        const shellBtn = document.getElementById('download-sh-btn');
        if (shellBtn) shellBtn.onclick = () => this.downloadShellScript();
        
        const ymlBtn = document.getElementById('download-yml-btn');
        if (ymlBtn) ymlBtn.onclick = () => this.downloadBlueprint();

        window.addEventListener('languageChanged', () => {
            this.generateCommand();
        });
    },

    loadSavedStacks: function() {
        this.savedStacks = JSON.parse(localStorage.getItem('wptoolbox_stacks') || '[]');
        this.renderSavedStacks();
    },

    saveCurrentStack: function() {
        const name = prompt("Enter a name for this stack (e.g. Starter Pack, SEO Pack):");
        if (!name) return;

        const stack = {
            id: Date.now(),
            name: name,
            themes: this.config.themes.filter(t => t.active).map(t => t.slug),
            plugins: this.config.plugins.filter(p => p.active).map(p => p.slug)
        };

        this.savedStacks.push(stack);
        localStorage.setItem('wptoolbox_stacks', JSON.stringify(this.savedStacks));
        this.renderSavedStacks();
        App.showToast("Stack saved successfully!");
        App.fireConfetti();
    },

    renderSavedStacks: function() {
        const container = document.getElementById('saved-stacks-container');
        if (!container) return;
        container.innerHTML = '';

        this.savedStacks.forEach(stack => {
            const card = document.createElement('div');
            card.className = 'shadcn-card p-4 flex items-center justify-between border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 transition-none';
            card.innerHTML = `
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-white truncate">${stack.name}</p>
                    <p class="text-[10px] text-zinc-500 uppercase tracking-tighter mt-1">${stack.themes.length} Themes, ${stack.plugins.length} Plugins</p>
                </div>
                <div class="flex gap-2">
                    <button class="btn-apply shadcn-button shadcn-button-outline w-8 h-8 p-0 flex items-center justify-center">
                        <i data-lucide="play" class="w-3 h-3 text-emerald-500"></i>
                    </button>
                    <button class="btn-delete shadcn-button shadcn-button-outline w-8 h-8 p-0 flex items-center justify-center">
                        <i data-lucide="trash-2" class="w-3 h-3 text-zinc-600 hover:text-red-500"></i>
                    </button>
                </div>
            `;
            card.querySelector('.btn-apply').onclick = () => this.applyStack(stack.id);
            card.querySelector('.btn-delete').onclick = () => this.deleteStack(stack.id);
            container.appendChild(card);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    },

    applyStack: function(id) {
        const stack = this.savedStacks.find(s => s.id === id);
        if (!stack) return;

        this.config.themes.forEach(t => {
            t.active = stack.themes.includes(t.slug);
            const cb = document.getElementById(`cb-${t.id}`);
            if (cb) cb.checked = t.active;
        });

        this.config.plugins.forEach(p => {
            p.active = stack.plugins.includes(p.slug);
            const cb = document.getElementById(`cb-${p.id}`);
            if (cb) cb.checked = p.active;
        });

        document.getElementById('theme-options').innerHTML = '';
        document.getElementById('plugin-options').innerHTML = '';
        this.renderCheckboxes();
        this.generateCommand();
        App.showToast(`Applied ${stack.name}`);
    },

    deleteStack: function(id) {
        if (!confirm("Are you sure you want to delete this stack?")) return;
        this.savedStacks = this.savedStacks.filter(s => s.id !== id);
        localStorage.setItem('wptoolbox_stacks', JSON.stringify(this.savedStacks));
        this.renderSavedStacks();
        App.showToast("Stack deleted.");
    },

    renderCheckboxes: function() {
        const themeContainer = document.getElementById('theme-options');
        const pluginContainer = document.getElementById('plugin-options');

        if (!themeContainer || !pluginContainer) return;

        // Render Themes
        this.config.themes.forEach(theme => {
            themeContainer.appendChild(this.createCheckbox(theme, 'theme'));
        });

        // Render Plugins
        this.config.plugins.forEach(plugin => {
            pluginContainer.appendChild(this.createCheckbox(plugin, 'plugin'));
        });
        
        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
    },

    createCheckbox: function(item, type) {
        const div = document.createElement('div');

        const updateStyle = (isActive) => {
            if (isActive) {
                div.className = 'flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/5 transition-none cursor-pointer group';
            } else {
                div.className = 'flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-none cursor-pointer group';
            }
        };

        updateStyle(item.active);

        const id = `cb-${item.id}`;
        div.innerHTML = `
            <div class="relative flex items-center justify-center">
                <input type="checkbox" id="${id}" ${item.active ? 'checked' : ''} 
                    class="peer appearance-none w-4 h-4 rounded border border-primary shrink-0 checked:bg-primary transition-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
                <i data-lucide="check" class="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-none"></i>
            </div>
            <label for="${id}" class="flex-1 text-sm font-medium ${item.active ? 'text-white' : 'text-zinc-300'} cursor-pointer group-hover:text-white transition-none">${item.name}</label>
        `;

        const checkbox = div.querySelector('input');
        const label = div.querySelector('label');

        const handleChange = () => {
            item.active = checkbox.checked;
            updateStyle(item.active);
            if (item.active) {
                label.classList.add('text-white');
                label.classList.remove('text-zinc-300');
            } else {
                label.classList.remove('text-white');
                label.classList.add('text-zinc-300');
            }
            this.generateCommand();
        };

        checkbox.onchange = handleChange;

        div.onclick = (e) => {
            if (e.target !== checkbox && e.target.tagName !== 'LABEL') {
                checkbox.checked = !checkbox.checked;
                handleChange();
            }
        };

        return div;
    },

    generateCommand: function() {
        const output = document.getElementById('command-output');
        if (!output) return;
        const includeActivateEl = document.getElementById('include-activate');
        const includeActivate = includeActivateEl ? includeActivateEl.checked : true;
        const activateFlag = includeActivate ? ' --activate' : '';

        const selectedThemes = this.config.themes.filter(t => t.active).map(t => t.slug);
        const selectedPlugins = this.config.plugins.filter(p => p.active).map(p => p.slug);

        let command = '';

        if (selectedThemes.length > 0) {
            command += `wp theme install ${selectedThemes.join(' ')}${activateFlag}`;
        }

        if (selectedPlugins.length > 0) {
            if (command) command += ' && \\\n';
            command += `wp plugin install ${selectedPlugins.join(' ')}${activateFlag}`;
        }

        if (!command) {
            output.textContent = App.t('stack_placeholder') || '# Select some themes or plugins to generate a command...';
            return;
        }

        output.textContent = command;
    },

    downloadShellScript: function() {
        const command = document.getElementById('command-output').textContent;
        if (!command || command.startsWith('#')) return;
        const script = `#!/bin/bash\n# Awesome Stack Setup Script\n\n${command}`;
        App.downloadFile(script, 'setup-stack.sh', 'text/x-shellscript');
        App.fireConfetti();
    },

    downloadBlueprint: function() {
        const selectedThemes = this.config.themes.filter(t => t.active).map(t => t.slug);
        const selectedPlugins = this.config.plugins.filter(p => p.active).map(p => p.slug);

        const blueprint = {
            "landingPage": "/wp-admin/",
            "preferredPhpVersion": "8.0",
            "plugins": selectedPlugins,
            "themes": selectedThemes,
            "steps": [
                {
                    "step": "installPlugin",
                    "pluginZip": selectedPlugins
                }
            ]
        };

        App.downloadFile(JSON.stringify(blueprint, null, 2), 'blueprint.json', 'application/json');
        App.fireConfetti();
    }
});
