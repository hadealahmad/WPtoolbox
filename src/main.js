/**
 * WPToolbox Main Entry Point
 */
import { App } from './core/app.js';
import './styles/main.css';
import './components/navbar.js';
import './components/footer.js';
import './components/consent-banner.js';

function boot() {
    App.init();
    if (document.body && !document.querySelector('wpt-consent')) {
        document.body.appendChild(document.createElement('wpt-consent'));
    }
}

// Auto-init on load if not already initialized
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

export { App };
