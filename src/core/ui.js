/**
 * WPToolbox Shared UI Components and logic
 */
import { State } from './state.js';
import { I18n } from './i18n.js';
import confetti from 'canvas-confetti';

export const UI = {
    initTheme() {
        document.documentElement.classList.add('dark');
    },

    initCommandPalette() {
        if (document.getElementById('cmd-palette')) return;

        const palette = document.createElement('div');
        palette.id = 'cmd-palette';
        palette.className = 'fixed inset-0 z-[100] hidden flex items-start justify-center pt-[10vh] px-4 bg-zinc-950/80 backdrop-blur-sm';
        palette.innerHTML = `
            <div class="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div class="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
                    <i data-lucide="search" class="w-5 h-5 text-zinc-500"></i>
                    <input type="text" id="cmd-search" class="bg-transparent border-none focus:outline-none text-white w-full text-base" 
                        placeholder="${I18n.t('palette_placeholder')}">
                </div>
                <div id="cmd-results" class="max-h-[400px] overflow-y-auto p-2"></div>
            </div>
        `;
        document.body.appendChild(palette);

        const input = palette.querySelector('#cmd-search');
        const results = palette.querySelector('#cmd-results');

        const updatePalette = () => {
            const tools = State.nav.flatMap(group => 
                group.items.map(item => ({
                    name: I18n.t(item.text),
                    href: item.href,
                    icon: item.icon
                }))
            );

            const renderTools = (filter = '') => {
                const filtered = tools.filter(t => (t.name || '').toLowerCase().includes((filter || '').toLowerCase()));
                results.innerHTML = filtered.map((t, idx) => `
                    <a href="${t.href}" class="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 group transition-none">
                        <div class="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-none">
                            <i data-lucide="${t.icon}" class="w-4 h-4"></i>
                        </div>
                        <span class="text-sm font-medium text-zinc-300 group-hover:text-white">${t.name}</span>
                    </a>
                `).join('');
                if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons, attrs: { class: 'w-4 h-4' }, container: results });
            };

            input.oninput = (e) => renderTools(e.target.value);
            renderTools();
        };

        window.addEventListener('languageChanged', updatePalette);
        window.addEventListener('dataLoaded', updatePalette);

        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                palette.classList.toggle('hidden');
                if (!palette.classList.contains('hidden')) input.focus();
            }
            if (e.key === 'Escape') palette.classList.add('hidden');
        });

        palette.onclick = (e) => { if (e.target === palette) palette.classList.add('hidden'); };
        updatePalette();
    },

    showToast(msg, duration = 3000) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-msg');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = msg;
        toast.classList.remove('translate-y-24', 'opacity-0');

        setTimeout(() => {
            toast.classList.add('translate-y-24', 'opacity-0');
        }, duration);
    },

    fireConfetti() {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#0ad28d', '#ffffff', '#1a1a1a']
            });
        }
    }
};
