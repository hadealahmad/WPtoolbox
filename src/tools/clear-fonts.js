/**
 * Font Cleaner Tool Module
 */
import '../main.js';
import { App } from '../core/app.js';

export const ClearFonts = {
    init: () => {
        const input = document.getElementById('input');
        const output = document.getElementById('output');
        if (!input || !output) return;

        input.oninput = () => {
            let val = input.value;
            // Enhanced regex to catch font-family in both JSON and standard comment styles
            val = val.replace(/"fontFamily":"[^"]*",?/g, '');
            val = val.replace(/font-family:[^;"]*;?/g, '');
            // Clean up trailing commas in objects
            val = val.replace(/,}/g, '}');
            output.value = val;
        };
    }
};

// Auto-init
// Expose globally
window.ClearFonts = ClearFonts;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ClearFonts.init);
} else {
    ClearFonts.init();
}
