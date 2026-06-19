/**
 * Font Cleaner Tool Module
 */
import '../main.js';
import { App } from '../core/app.js';

export const ClearFonts = App.registerTool('ClearFonts', {
    onInit: function() {
        const input = document.getElementById('input');
        const output = document.getElementById('output');
        const clearBtn = document.querySelector('[data-i18n="btn_clear"]');
        const copyBtn = document.querySelector('[data-i18n="btn_copy_result"]');
        
        if (!input || !output) return;

        input.oninput = () => {
            let val = input.value;
            // Robust regex to catch font-family (string/array, single/double/no quotes) in both JSON and standard styles
            val = val.replace(/"?(fontFamily|font-family)"?:\s*(?:\[[^\]]*\]|"[^"]*"|'[^']*'),?/g, '');
            val = val.replace(/font-family:[^;"]*;?/g, '');
            // Clean up trailing commas in objects
            val = val.replace(/,\s*}/g, '}');
            output.value = val;
        };

        if (clearBtn) {
            clearBtn.onclick = () => {
                input.value = '';
                output.value = '';
            };
        }

        if (copyBtn) {
            copyBtn.onclick = () => {
                App.copyToClipboard(output.value, copyBtn);
            };
        }
    }
});
