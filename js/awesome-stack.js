/**
 * Awesome Stack - Quick WordPress Setup Logic
 */
const AwesomeStack = {
    config: {
        themes: [
            { id: 'blocksy', slug: 'blocksy', name: 'Blocksy Theme', active: true },
            { id: 'blocksy-child', slug: 'https://creativethemes.com/blocksy/blocksy-child.zip', name: 'Blocksy Child Theme', active: false }
        ],
        plugins: [
            { id: 'blocksy-companion', slug: 'blocksy-companion', name: 'Blocksy Companion', active: true },
            { id: 'greenshift', slug: 'greenshift-animation-and-page-builder-blocks', name: 'Greenshift (Page Builder)', active: true },
            { id: 'rank-math', slug: 'seo-by-rank-math', name: 'Rank Math SEO', active: true },
            { id: 'forminator', slug: 'forminator', name: 'Forminator (Forms)', active: false },
            { id: 'polylang', slug: 'polylang', name: 'Polylang (Multilingual)', active: false },
            { id: 'litespeed', slug: 'litespeed-cache', name: 'LiteSpeed Cache', active: false },
            { id: 'recaptcha', slug: 'advanced-google-recaptcha', name: 'Advanced Google reCAPTCHA', active: false },
            { id: 'zoho', slug: 'zoho-mail', name: 'Zoho Mail', active: false }
        ]
    },

    init: () => {
        AwesomeStack.renderCheckboxes();
        AwesomeStack.generateCommand();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Listen for options changes
        document.getElementById('include-activate').onchange = AwesomeStack.generateCommand;
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

        // Make whole div clickable
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
    }
};


document.addEventListener('languageChanged', () => {
    AwesomeStack.generateCommand();
});

document.addEventListener('DOMContentLoaded', AwesomeStack.init);
