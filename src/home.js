/**
 * Home page logic (Tip of the Day)
 */
import './main.js';
import { App } from './core/app.js';
import tipsData from './data/tips.json';

export const Home = {
    init: async () => {
        const tips = tipsData;
        if (tips.length > 0) {
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            const card = document.getElementById('tip-of-day-card');
            const content = document.getElementById('tip-content');
            if (card && content) {
                const isAr = App.currentLang === 'ar';
                content.textContent = isAr ? (randomTip.fact.ar || randomTip.fact.en) : randomTip.fact.en;
                card.classList.remove('hidden');
                window._currentTip = randomTip;
            }
        }

        // Filtering Logic
        const filterBtns = document.querySelectorAll('.filter-btn');
        const toolCards = document.querySelectorAll('.tool-card');

        filterBtns.forEach(btn => {
            btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;

                // Update active button
                filterBtns.forEach(b => {
                    const isSelected = b === btn;
                    b.classList.toggle('active', isSelected);
                    b.classList.toggle('shadcn-button-primary', isSelected);
                    b.classList.toggle('shadcn-button-outline', !isSelected);
                    b.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
                });

                // Filter cards with class toggles (animations respect prefers-reduced-motion)
                toolCards.forEach(card => {
                    const match = category === 'all' || category === card.dataset.category;
                    card.classList.add('motion-reduce:transition-none', 'motion-reduce:animate-none');
                    card.classList.toggle('hidden', !match);
                    card.classList.toggle('flex', match);
                    card.classList.toggle('motion-safe:animate-in', match);
                    card.classList.toggle('motion-safe:fade-in', match);
                    card.classList.toggle('motion-safe:duration-200', match);
                });
            });
        });

        window.addEventListener('languageChanged', (e) => {
            const isAr = e.detail.lang === 'ar';
            const content = document.getElementById('tip-content');
            if (content && window._currentTip) {
                content.textContent = isAr ? (window._currentTip.fact.ar || window._currentTip.fact.en) : window._currentTip.fact.en;
            }
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Home.init);
} else {
    Home.init();
}
