/**
 * Font Family Cleaner Module
 */
const FontCleaner = {
    elements: {
        input: document.getElementById('input'),
        output: document.getElementById('output'),
        statBadge: document.getElementById('stat-badge')
    },

    clean: () => {
        const raw = FontCleaner.elements.input.value.trim();
        if (!raw) {
            App.showToast("Paste some code first");
            return;
        }

        let removalCount = 0;
        const wpBlockRegex = /<!-- wp:([^\s]+)\s+({[\s\S]*?})\s+-->/g;

        const cleaned = raw.replace(wpBlockRegex, (match, blockName, jsonStr) => {
            try {
                const data = JSON.parse(jsonStr);
                let changed = false;

                const paths = [
                    ['styleAttributes', 'fontFamily'],
                    ['styleAttributes', 'typography', 'fontFamily'],
                    ['style', 'typography', 'fontFamily']
                ];

                paths.forEach(path => {
                    let curr = data;
                    for (let i = 0; i < path.length - 1; i++) {
                        if (!curr[path[i]]) return;
                        curr = curr[path[i]];
                    }
                    if (curr[path[path.length - 1]]) {
                        delete curr[path[path.length - 1]];
                        removalCount++;
                        changed = true;
                    }
                });

                return changed ? `<!-- wp:${blockName} ${JSON.stringify(data)} -->` : match;
            } catch (e) {
                return match;
            }
        });

        FontCleaner.elements.output.value = cleaned;
        FontCleaner.elements.statBadge.textContent = `${removalCount} Removed`;
        FontCleaner.elements.statBadge.classList.remove('hidden');
        App.showToast(`Cleaned and removed ${removalCount} fonts`);
    },

    reset: () => {
        FontCleaner.elements.input.value = "";
        FontCleaner.elements.output.value = "";
        FontCleaner.elements.statBadge.classList.add('hidden');
    }
};
