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
            if (!card || !content) return;
            
            const isAr = App.currentLang === 'ar';
            content.textContent = isAr ? (randomTip.fact.ar || randomTip.fact.en) : randomTip.fact.en;
            card.classList.remove('hidden');
            
            // Keep the tip reference for language changes
            window._currentTip = randomTip;
        }

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
