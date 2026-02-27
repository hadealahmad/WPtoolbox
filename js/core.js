/**
 * WPToolbox Core Utilities
 * Shared logic for all tools
 */

const App = {
    /**
     * Initialize Lucide icons, theme, and shared components
     */
    init: () => {
        App.initTheme(); // Must be first to prevent light flash
        App.renderNavbar();
        App.renderFooter();
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    /**
     * Set up dark theme (Dark Only Mode)
     */
    initTheme: () => {
        document.documentElement.classList.add('dark');
        // We no longer check localStorage as dark mode is now mandatory
    },

    /**
     * Render the unified navbar
     */
    renderNavbar: () => {
        const nav = document.getElementById('global-nav');
        if (!nav) return;

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const links = [
            { href: 'clearfonts.html', text: 'Font Cleaner' },
            { href: 'xml2csv.html', text: 'XML Converter' },
            { href: 'json2csv.html', text: 'JSON to CSV' },
            { href: 'snippets.html', text: 'Snippets' },
            { href: 'awesomestack.html', text: 'Awesome Stack' }
        ];

        const navHtml = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16 items-center">
                    <div class="flex items-center gap-2">
                        <div class="p-1.5 bg-zinc-900 dark:bg-zinc-800 text-white rounded-lg">
                            <i data-lucide="layout-grid" class="w-5 h-5"></i>
                        </div>
                        <a href="index.html" class="text-lg font-bold tracking-tight text-white">WPToolbox</a>
                    </div>
                    <div class="hidden md:flex items-center gap-6">
                        ${links.map(link => `
                            <a href="${link.href}" class="text-sm font-medium ${currentPath === link.href ? 'text-white' : 'text-zinc-500 hover:text-white'} transition-none">${link.text}</a>
                        `).join('')}
                        <div class="h-4 w-px bg-zinc-800"></div>
                        <a href="https://github.com/hadi" target="_blank" class="text-zinc-400 hover:text-white transition-none">
                            <i data-lucide="github" class="w-5 h-5"></i>
                        </a>
                    </div>
                    <button class="md:hidden p-2 text-zinc-500"><i data-lucide="menu" class="w-6 h-6"></i></button>
                </div>
            </div>
        `;
        nav.innerHTML = navHtml;
    },

    /**
     * Render the unified footer
     */
    renderFooter: () => {
        const footer = document.getElementById('global-footer');
        if (!footer) return;

        footer.className = "bg-zinc-950 border-t border-zinc-900 py-12 mt-20 transition-none";
        footer.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div class="flex items-center gap-2">
                        <i data-lucide="zap" class="w-4 h-4 text-white"></i>
                        <span class="text-sm font-bold tracking-tighter uppercase text-white">WPToolbox</span>
                    </div>
                    <p class="text-zinc-400 text-xs text-center md:text-left">
                        &copy; 2024 WPToolbox Pro. Privacy-first local processing.
                    </p>
                    <div class="flex items-center gap-6">
                        <a href="#" class="text-zinc-400 hover:text-white transition-none"><i data-lucide="twitter" class="w-4 h-4"></i></a>
                        <a href="https://github.com/hadi" target="_blank" class="text-zinc-400 hover:text-white transition-none"><i data-lucide="github" class="w-4 h-4"></i></a>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Show a global toast notification
     */
    showToast: (msg, duration = 3000) => {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-msg');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = msg;
        toast.classList.remove('translate-y-24', 'opacity-0');

        setTimeout(() => {
            toast.classList.add('translate-y-24', 'opacity-0');
        }, duration);
    },

    /**
     * Handle CSV string escaping
     */
    escapeCSV: (val) => {
        if (val === null || val === undefined) return '""';
        let s = String(val).replace(/\r/g, '').replace(/\n/g, ' ');
        if (/[",\n\r]/.test(s)) {
            s = `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    },

    /**
     * Programmatic file download
     */
    downloadFile: (content, filename, type = 'text/csv;charset=utf-8;') => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    copyToClipboard: async (text, btnElement, feedbackText = "Copied!") => {
        const cleanText = String(text || "").trim();
        if (!cleanText) return;

        const performFeedback = () => {
            const originalText = btnElement.innerHTML;
            btnElement.innerHTML = feedbackText;
            App.showToast("Copied to clipboard");
            setTimeout(() => {
                btnElement.innerHTML = originalText;
            }, 2000);
        };

        try {
            // Priority 1: Modern Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(cleanText);
                performFeedback();
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            // Priority 2: Fallback Legacy execCommand
            try {
                const textArea = document.createElement("textarea");
                textArea.value = cleanText;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    performFeedback();
                } else {
                    throw new Error('ExecCommand failed');
                }
            } catch (fallbackErr) {
                App.showToast("Failed to copy", 2000);
            }
        }
    }
};

// Auto-init on load
document.addEventListener('DOMContentLoaded', App.init);
