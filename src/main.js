/**
 * WPToolbox Main Entry Point
 */
import { App } from './core/app.js';
import './styles/main.css';
import './components/navbar.js';
import './components/footer.js';

// Auto-init on load if not already initialized
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

export { App };
