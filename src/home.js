/**
 * Home page logic (Tip of the Day)
 */
import './main.js';
import { App } from './core/app.js';

export const Home = {
    init: async () => {
        try {
            const res = await fetch('./js/data/tips.json');
            const tips = await res.json();
            if (tips.length > 0) {
                const randomTip = tips[Math.floor(Math.random() * tips.length)];
                const card = document.getElementById('tip-of-day-card');
                const content = document.getElementById('tip-content');
                if (!card || !content) return;
                
                const isAr = localStorage.getItem('wptoolbox_lang') === 'ar';
                content.textContent = isAr ? (randomTip.fact.ar || randomTip.fact.en) : randomTip.fact.en;
                card.classList.remove('hidden');
                
                // Keep the tip reference for language changes
                window._currentTip = randomTip;
            }
        } catch (e) {
            console.error("Failed to load tips", e);
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
