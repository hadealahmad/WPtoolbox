import '../main.js';
import { App } from '../core/app.js';
import { UI } from '../core/ui.js';

export const ServerConfigGenerator = App.registerTool('ServerConfigGenerator', {
    serverType: 'apache', // 'apache' or 'nginx'

    onInit: function() {
        this.bindEvents();
        this.generateCode();
    },

    bindEvents: function() {
        const btnApache = document.getElementById('btn-apache');
        const btnNginx = document.getElementById('btn-nginx');

        if (btnApache) {
            btnApache.addEventListener('click', () => {
                this.serverType = 'apache';
                btnApache.classList.replace('text-zinc-400', 'text-white');
                btnApache.classList.add('bg-zinc-800', 'shadow');
                btnNginx.classList.replace('text-white', 'text-zinc-400');
                btnNginx.classList.remove('bg-zinc-800', 'shadow');
                document.getElementById('filename-display').textContent = '.htaccess';
                this.generateCode();
            });
        }

        if (btnNginx) {
            btnNginx.addEventListener('click', () => {
                this.serverType = 'nginx';
                btnNginx.classList.replace('text-zinc-400', 'text-white');
                btnNginx.classList.add('bg-zinc-800', 'shadow');
                btnApache.classList.replace('text-white', 'text-zinc-400');
                btnApache.classList.remove('bg-zinc-800', 'shadow');
                document.getElementById('filename-display').textContent = 'nginx.conf';
                this.generateCode();
            });
        }

        document.querySelectorAll('.config-toggle').forEach(toggle => {
            toggle.addEventListener('change', () => this.generateCode());
        });

        const btnCopy = document.getElementById('btn-copy');
        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                const code = document.getElementById('code-output').textContent;
                navigator.clipboard.writeText(code).then(() => {
                    UI.showToast(App.t('msg_snippet_saved') || "Copied to clipboard!");
                });
            });
        }
    },

    generateCode: function() {
        const https = document.getElementById('opt-https')?.checked;
        const caching = document.getElementById('opt-caching')?.checked;
        const gzip = document.getElementById('opt-gzip')?.checked;
        const dir = document.getElementById('opt-dir')?.checked;
        const wpinc = document.getElementById('opt-wpinc')?.checked;

        let code = '';

        if (this.serverType === 'apache') {
            code += `# BEGIN WordPress\n<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]\nRewriteBase /\nRewriteRule ^index\\.php$ - [L]\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule . /index.php [L]\n</IfModule>\n# END WordPress\n\n`;

            if (https) {
                code += `# Force HTTPS\n<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n</IfModule>\n\n`;
            }

            if (dir) {
                code += `# Disable Directory Browsing\nOptions -Indexes\n\n`;
            }

            if (wpinc) {
                code += `# Block the include-only files.\n<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteBase /\nRewriteRule ^wp-admin/includes/ - [F,L]\nRewriteRule !^wp-includes/ - [S=3]\nRewriteRule ^wp-includes/[^/]+\\.php$ - [F,L]\nRewriteRule ^wp-includes/js/tinymce/langs/.+\\.php - [F,L]\nRewriteRule ^wp-includes/theme-compat/ - [F,L]\n</IfModule>\n\n`;
            }

            if (gzip) {
                code += `# Enable Gzip Compression\n<IfModule mod_deflate.c>\nAddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json application/xml\n</IfModule>\n\n`;
            }

            if (caching) {
                code += `# Browser Caching\n<IfModule mod_expires.c>\nExpiresActive On\nExpiresByType image/jpg "access plus 1 year"\nExpiresByType image/jpeg "access plus 1 year"\nExpiresByType image/gif "access plus 1 year"\nExpiresByType image/png "access plus 1 year"\nExpiresByType text/css "access plus 1 month"\nExpiresByType application/pdf "access plus 1 month"\nExpiresByType text/x-javascript "access plus 1 month"\nExpiresByType application/x-shockwave-flash "access plus 1 month"\nExpiresByType image/x-icon "access plus 1 year"\nExpiresDefault "access plus 2 days"\n</IfModule>\n`;
            }

        } else if (this.serverType === 'nginx') {
            code += `# WordPress Core Permalinks\nlocation / {\n    try_files $uri $uri/ /index.php?$args;\n}\n\n`;

            if (https) {
                code += `# Force HTTPS\nserver {\n    listen 80;\n    server_name example.com www.example.com;\n    return 301 https://example.com$request_uri;\n}\n\n`;
            }

            if (dir) {
                code += `# Disable Directory Browsing\nautoindex off;\n\n`;
            }

            if (wpinc) {
                code += `# Block wp-includes\nlocation ~* ^/wp-includes/.*(?<!(js|css|gif|png|jpe?g|svg|woff2?|ttf|eot))$ {\n    deny all;\n}\n\n`;
            }

            if (gzip) {
                code += `# Enable Gzip Compression\ngzip on;\ngzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;\n\n`;
            }

            if (caching) {
                code += `# Browser Caching\nlocation ~* \\.(jpg|jpeg|gif|png|webp|svg|woff2|ttf|css|js|ico)$ {\n    expires 365d;\n    access_log off;\n    add_header Cache-Control "public";\n}\n`;
            }
        }

        const out = document.getElementById('code-output');
        if (out) out.textContent = code.trim();
    }
});
