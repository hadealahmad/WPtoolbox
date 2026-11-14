/**
 * Awesome Stack - Quick WordPress Setup Logic
 */
import '../main.js';
import { App } from '../core/app.js';
import { createIcons, icons } from 'lucide';
import stackConfig from '../data/stack-config.json';

export const AwesomeStack = App.registerTool('AwesomeStack', {
    config: stackConfig,
    savedStacks: [],

    onInit: function() {
        const runInit = () => {
            this.renderCheckboxes();
            this.loadSavedStacks();
            this.generateCommand();
        };

        // Wait for translations and core services to be ready
        if (App.isReady) {
            runInit();
        } else {
            window.addEventListener('appReady', runInit);
        }

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
            this.renderSavedStacks();
        });
    },

    loadSavedStacks: function() {
        try {
            const raw = JSON.parse(localStorage.getItem('wptoolbox_stacks') || '[]');
            this.savedStacks = Array.isArray(raw) ? raw : [];
        } catch {
            this.savedStacks = [];
        }
        this.renderSavedStacks();
    },

    persistSavedStacks: function() {
        localStorage.setItem('wptoolbox_stacks', JSON.stringify(this.savedStacks));
    },

    saveCurrentStack: async function() {
        const promptText = App.t('prompt_stack_name') || 'Enter a name for this stack (e.g. Starter Pack, SEO Pack):';
        const rawName = await App.prompt(promptText, '', { placeholder: 'Starter Pack' });
        const name = (rawName || '').trim();
        if (!name) return;

        const stack = {
            id: Date.now(),
            name,
            themes: this.config.themes.filter(t => t.active).map(t => t.slug),
            plugins: this.config.plugins.filter(p => p.active).map(p => p.slug)
        };

        this.savedStacks.push(stack);
        this.persistSavedStacks();
        this.renderSavedStacks();
        App.showToast(App.t('msg_stack_saved') || 'Stack saved successfully!', 'success');
        App.fireConfetti();
    },

    renameStack: async function(id) {
        const stack = this.savedStacks.find(s => s.id === id);
        if (!stack) return;
        const promptText = App.t('prompt_rename_stack') || 'Rename stack:';
        const rawName = await App.prompt(promptText, String(stack.name || ''));
        const nextName = (rawName || '').trim();
        if (!nextName || nextName === stack.name) return;

        stack.name = nextName;
        this.persistSavedStacks();
        this.renderSavedStacks();
        App.showToast(App.t('msg_stack_renamed') || 'Stack renamed!', 'success');
    },

    renderSavedStacks: function() {
        const container = document.getElementById('saved-stacks-container');
        if (!container) return;
        container.replaceChildren();

        this.savedStacks.forEach(stack => {
            const stackName = String(stack?.name || 'Stack');
            const themeCount = Array.isArray(stack?.themes) ? stack.themes.length : 0;
            const pluginCount = Array.isArray(stack?.plugins) ? stack.plugins.length : 0;

            const card = App.h(
                'div',
                { class: 'shadcn-card p-4 flex items-center justify-between gap-2 border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 transition-none' },
                App.h(
                    'div',
                    { class: 'flex-1 min-w-0' },
                    App.h('p', { class: 'text-sm font-bold text-white truncate', text: stackName }),
                    App.h('p', {
                        class: 'text-[10px] text-zinc-500 uppercase tracking-tighter mt-1',
                        text: `${themeCount} Themes, ${pluginCount} Plugins`
                    })
                ),
                App.h(
                    'div',
                    { class: 'flex gap-2 shrink-0' },
                    App.h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn-apply shadcn-button shadcn-button-outline w-8 h-8 p-0 flex items-center justify-center',
                            attrs: { 'aria-label': `Apply ${stackName}` },
                            on: { click: () => this.applyStack(stack.id) }
                        },
                        App.h('i', { attrs: { 'data-lucide': 'play' }, class: 'w-3 h-3 text-emerald-500' })
                    ),
                    App.h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn-rename shadcn-button shadcn-button-outline w-8 h-8 p-0 flex items-center justify-center',
                            attrs: { 'aria-label': `Rename ${stackName}` },
                            on: { click: () => this.renameStack(stack.id) }
                        },
                        App.h('i', { attrs: { 'data-lucide': 'pencil' }, class: 'w-3 h-3 text-zinc-400 hover:text-primary' })
                    ),
                    App.h(
                        'button',
                        {
                            type: 'button',
                            class: 'btn-delete shadcn-button shadcn-button-outline w-8 h-8 p-0 flex items-center justify-center',
                            attrs: { 'aria-label': `Delete ${stackName}` },
                            on: { click: () => this.deleteStack(stack.id) }
                        },
                        App.h('i', { attrs: { 'data-lucide': 'trash-2' }, class: 'w-3 h-3 text-zinc-600 hover:text-red-500' })
                    )
                )
            );
            container.appendChild(card);
        });
        createIcons({ icons, root: container });
    },

    applyStack: function(id) {
        const stack = this.savedStacks.find(s => s.id === id);
        if (!stack) return;
        const themes = Array.isArray(stack.themes) ? stack.themes : [];
        const plugins = Array.isArray(stack.plugins) ? stack.plugins : [];

        this.config.themes.forEach(t => {
            t.active = themes.includes(t.slug);
        });

        this.config.plugins.forEach(p => {
            p.active = plugins.includes(p.slug);
        });

        this.renderCheckboxes();
        this.generateCommand();
        App.showToast(`Applied ${String(stack.name || '')}`);
    },

    deleteStack: async function(id) {
        const confirmText = App.t('confirm_delete_stack') || 'Are you sure you want to delete this stack?';
        const ok = await App.confirm(confirmText, { danger: true });
        if (!ok) return;

        this.savedStacks = this.savedStacks.filter(s => s.id !== id);
        this.persistSavedStacks();
        this.renderSavedStacks();
        App.showToast(App.t('msg_stack_deleted') || 'Stack deleted.');
    },

    renderCheckboxes: function() {
        const themeContainer = document.getElementById('theme-options');
        const pluginContainer = document.getElementById('plugin-options');

        if (!themeContainer || !pluginContainer) return;
        themeContainer.replaceChildren();
        pluginContainer.replaceChildren();

        // Render Themes
        this.config.themes.forEach(theme => {
            themeContainer.appendChild(this.createCheckbox(theme, 'theme'));
        });

        // Render Plugins
        this.config.plugins.forEach(plugin => {
            pluginContainer.appendChild(this.createCheckbox(plugin, 'plugin'));
        });

        createIcons({ icons, root: themeContainer });
        createIcons({ icons, root: pluginContainer });
    },

    createCheckbox: function(item, _type) {
        const id = `cb-${item.id}`;
        const activeRowClass = 'flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/5 transition-none cursor-pointer group';
        const inactiveRowClass = 'flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-none cursor-pointer group';

        const checkbox = App.h('input', {
            attrs: { type: 'checkbox', id, ...(item.active ? { checked: '' } : {}) },
            class: 'peer appearance-none w-4 h-4 rounded border border-primary shrink-0 checked:bg-primary transition-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        });
        checkbox.checked = !!item.active;

        const labelText = App.h('span', {
            class: `flex-1 text-sm font-medium ${item.active ? 'text-white' : 'text-zinc-300'} group-hover:text-white transition-none`,
            text: String(item.name || '')
        });

        const row = App.h(
            'label',
            {
                attrs: { for: id },
                class: item.active ? activeRowClass : inactiveRowClass
            },
            App.h(
                'div',
                { class: 'relative flex items-center justify-center' },
                checkbox,
                App.h('i', {
                    attrs: { 'data-lucide': 'check' },
                    class: 'absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-none'
                })
            ),
            labelText
        );

        checkbox.onchange = () => {
            item.active = checkbox.checked;
            row.className = item.active ? activeRowClass : inactiveRowClass;
            labelText.classList.toggle('text-white', item.active);
            labelText.classList.toggle('text-zinc-300', !item.active);
            this.generateCommand();
        };

        return row;
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
