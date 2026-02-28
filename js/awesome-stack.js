/**
 * Awesome Stack - Quick WordPress Setup Logic
 */
const AwesomeStack = {
    config: {
        themes: [],
        plugins: []
    },

    savedStacks: [],

    init: async () => {
        try {
            const response = await fetch('js/data/stack-config.json');
            if (!response.ok) throw new Error('Failed to load stack config');
            AwesomeStack.config = await response.json();

            AwesomeStack.renderCheckboxes();
            AwesomeStack.loadSavedStacks();
            AwesomeStack.generateCommand();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Listen for options changes
            document.getElementById('include-activate').onchange = AwesomeStack.generateCommand;
            document.getElementById('copy-btn').onclick = (e) => App.copyToClipboard(document.getElementById('command-output').textContent, e.target);
            document.getElementById('save-stack-btn').onclick = AwesomeStack.saveCurrentStack;
            document.getElementById('download-sh-btn').onclick = AwesomeStack.downloadShellScript;
            document.getElementById('download-yml-btn').onclick = AwesomeStack.downloadBlueprint;
        } catch (err) {
            console.error('Error initializing AwesomeStack:', err);
        }
    },

    loadSavedStacks: () => {
        AwesomeStack.savedStacks = JSON.parse(localStorage.getItem('wptoolbox_stacks') || '[]');
        AwesomeStack.renderSavedStacks();
    },

    saveCurrentStack: () => {
        const name = prompt("Enter a name for this stack (e.g. Starter Pack, SEO Pack):");
        if (!name) return;

        const stack = {
            id: Date.now(),
            name: name,
            themes: AwesomeStack.config.themes.filter(t => t.active).map(t => t.id),
            plugins: AwesomeStack.config.plugins.filter(p => p.active).map(p => p.id)
        };

        AwesomeStack.savedStacks.push(stack);
        localStorage.setItem('wptoolbox_stacks', JSON.stringify(AwesomeStack.savedStacks));
        AwesomeStack.renderSavedStacks();
        App.showToast("Stack saved successfully!");
        App.fireConfetti();
    },

    renderSavedStacks: () => {
        const container = document.getElementById('saved-stacks-container');
        if (!container) return;
        container.innerHTML = '';

        AwesomeStack.savedStacks.forEach(stack => {
            const card = document.createElement('div');
            card.className = 'shadcn-card p-4 flex items-center justify-between border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 transition-none';
            card.innerHTML = `
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-white truncate">${stack.name}</p>
                    <p class="text-[10px] text-zinc-500 uppercase tracking-tighter mt-1">${stack.themes.length} Themes, ${stack.plugins.length} Plugins</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="AwesomeStack.applyStack(${stack.id})" class="shadcn-button shadcn-button-outline w-8 h-8 p-0 flex items-center justify-center">
                        <i data-lucide="play" class="w-3 h-3 text-emerald-500"></i>
                    </button>
                    <button onclick="AwesomeStack.deleteStack(${stack.id})" class="shadcn-button shadcn-button-outline w-8 h-8 p-0 flex items-center justify-center">
                        <i data-lucide="trash-2" class="w-3 h-3 text-zinc-600 hover:text-red-500"></i>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    applyStack: (id) => {
        const stack = AwesomeStack.savedStacks.find(s => s.id === id);
        if (!stack) return;

        AwesomeStack.config.themes.forEach(t => {
            t.active = stack.themes.includes(t.id);
            const cb = document.getElementById(`cb-${t.id}`);
            if (cb) cb.checked = t.active;
        });

        AwesomeStack.config.plugins.forEach(p => {
            p.active = stack.plugins.includes(p.id);
            const cb = document.getElementById(`cb-${p.id}`);
            if (cb) cb.checked = p.active;
        });

        // Re-render the visual state of the cards (not implemented in the modular way yet, so we re-render or just call generate)
        // For simplicity, let's just re-init or re-render checkboxes
        document.getElementById('theme-options').innerHTML = '';
        document.getElementById('plugin-options').innerHTML = '';
        AwesomeStack.renderCheckboxes();
        AwesomeStack.generateCommand();
        App.showToast(`Applied ${stack.name}`);
    },

    deleteStack: (id) => {
        AwesomeStack.savedStacks = AwesomeStack.savedStacks.filter(s => s.id !== id);
        localStorage.setItem('wptoolbox_stacks', JSON.stringify(AwesomeStack.savedStacks));
        AwesomeStack.renderSavedStacks();
    },

    renderCheckboxes: () => {
        const themeContainer = document.getElementById('theme-options');
        const pluginContainer = document.getElementById('plugin-options');

        if (!themeContainer || !pluginContainer) return;

        // Render Themes
        AwesomeStack.config.themes.forEach(theme => {
            themeContainer.appendChild(AwesomeStack.createCheckbox(theme, 'theme'));
        });

        // Render Plugins
        AwesomeStack.config.plugins.forEach(plugin => {
            pluginContainer.appendChild(AwesomeStack.createCheckbox(plugin, 'plugin'));
        });
    },

    createCheckbox: (item, type) => {
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
            AwesomeStack.generateCommand();
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

    generateCommand: () => {
        const output = document.getElementById('command-output');
        const includeActivate = document.getElementById('include-activate').checked;
        const activateFlag = includeActivate ? ' --activate' : '';

        const selectedThemes = AwesomeStack.config.themes.filter(t => t.active).map(t => t.slug);
        const selectedPlugins = AwesomeStack.config.plugins.filter(p => p.active).map(p => p.slug);

        let command = '';

        if (selectedThemes.length > 0) {
            command += `wp theme install ${selectedThemes.join(' ')}${activateFlag}`;
        }

        if (selectedPlugins.length > 0) {
            if (command) command += ' && \\\n';
            command += `wp plugin install ${selectedPlugins.join(' ')}${activateFlag}`;
        }

        if (!command) {
            output.textContent = App.t('stack_placeholder');
            return;
        }

        output.textContent = command;
    },

    downloadShellScript: () => {
        const command = document.getElementById('command-output').textContent;
        if (!command || command.startsWith('#')) return;
        const script = `#!/bin/bash\n# Awesome Stack Setup Script\n\n${command}`;
        App.downloadFile(script, 'setup-stack.sh', 'text/x-shellscript');
        App.fireConfetti();
    },

    downloadBlueprint: () => {
        const selectedThemes = AwesomeStack.config.themes.filter(t => t.active).map(t => t.slug);
        const selectedPlugins = AwesomeStack.config.plugins.filter(p => p.active).map(p => p.slug);

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
};

document.addEventListener('languageChanged', () => {
    AwesomeStack.generateCommand();
});

document.addEventListener('DOMContentLoaded', AwesomeStack.init);
