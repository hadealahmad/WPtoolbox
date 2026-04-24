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
            btn.onclick = () => {
                const category = btn.dataset.category;

                // Update active button
                filterBtns.forEach(b => b.classList.remove('active', 'shadcn-button-primary'));
                filterBtns.forEach(b => b.classList.add('shadcn-button-outline'));
                btn.classList.add('active', 'shadcn-button-primary');
                btn.classList.remove('shadcn-button-outline');

                // Filter cards
                toolCards.forEach(card => {
                    const cardCat = card.dataset.category;
                    if (category === 'all' || category === cardCat) {
                        card.style.display = 'flex';
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'scale(1)';
                        }, 10);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            };
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
