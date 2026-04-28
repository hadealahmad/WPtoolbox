/**
 * QR Code Generator Tool
 */
import '../main.js';
import { App } from '../core/app.js';
import JSZip from 'jszip';
import QRCode from 'qrcode';

function getValidFilename(urlStr) {
    try {
        const urlToParse = urlStr.startsWith('http') ? urlStr : 'https://' + urlStr;
        const u = new URL(urlToParse);
        let path = u.pathname;
        if (path === '/') path = '';
        let str = u.hostname + path;
        str = str.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        return str || 'qr-code';
    } catch {
       let str = String(urlStr).replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
       return str || 'qr-code';
    }
}

export const QRGenerator = App.registerTool('QRGenerator', {
    processedQRs: [],
    multiple: false,
    resultsId: 'results-section',

    onInit: function() {
        const generateBtn = document.getElementById('generate-btn');
        const downloadAllBtn = document.getElementById('download-all-btn');

        if (generateBtn) generateBtn.onclick = () => this.handleGenerate();
        if (downloadAllBtn) downloadAllBtn.onclick = () => this.downloadZip();

        this.initSocialOptions();
    },

    initSocialOptions: function() {
        const enableSocial = document.getElementById('enable-social');
        const socialOptions = document.getElementById('social-options');
        const bgType = document.getElementById('bg-type');
        const gradientOptions = document.getElementById('gradient-options');
        const imageOptions = document.getElementById('image-options');
        const imageUpload = document.getElementById('bg-image-upload');
        const imagePreview = document.getElementById('bg-image-preview');
        const uploadPrompt = document.getElementById('bg-upload-prompt');

        if (enableSocial && socialOptions) {
            enableSocial.addEventListener('change', (e) => {
                if (e.target.checked) {
                    socialOptions.classList.remove('hidden');
                } else {
                    socialOptions.classList.add('hidden');
                }
            });
        }

        if (bgType) {
            bgType.addEventListener('change', (e) => {
                if (e.target.value === 'gradient') {
                    gradientOptions.classList.remove('hidden');
                    imageOptions.classList.add('hidden');
                } else {
                    gradientOptions.classList.add('hidden');
                    imageOptions.classList.remove('hidden');
                }
            });
        }

        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        imagePreview.src = evt.target.result;
                        imagePreview.classList.remove('hidden');
                        uploadPrompt.classList.remove('opacity-100');
                        uploadPrompt.classList.add('opacity-0');
                        this.customBgImage = evt.target.result;
                        if (this.updatePreview) this.updatePreview();
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const updatePreview = async () => {
            if (!enableSocial || !enableSocial.checked) {
                document.getElementById('social-preview-container')?.classList.add('hidden');
                return;
            }
            
            const previewContainer = document.getElementById('social-preview-container');
            const previewImg = document.getElementById('social-preview-img');
            if (previewContainer) previewContainer.classList.remove('hidden');

            const linksInput = document.getElementById('links-input');
            const lines = linksInput ? linksInput.value.trim().split('\n').filter(l => l.trim()) : [];
            const previewLink = lines.length > 0 ? lines[0] : 'https://example.com';
            
            const aspectRatioVal = document.getElementById('aspect-ratio')?.value || '1:1';
            const bgTypeVal = document.getElementById('bg-type')?.value || 'gradient';
            const titleText = document.getElementById('qr-title')?.value || '';
            const showLink = document.getElementById('show-link')?.checked;
            
            const transparentBg = document.getElementById('transparent-bg');
            const isTransparent = transparentBg && transparentBg.checked;
            const bgOption = isTransparent ? '#00000000' : '#ffffff';

            try {
                const rawPngUrl = await QRCode.toDataURL(previewLink, {
                    type: 'image/png',
                    color: { light: bgOption, dark: '#000000' },
                    margin: 2,
                    width: 600
                });

                const socialImgUrl = await this.generateSocialImage(
                    rawPngUrl, 
                    aspectRatioVal, 
                    bgTypeVal, 
                    titleText, 
                    showLink, 
                    previewLink
                );
                
                if (previewImg) previewImg.src = socialImgUrl;
            } catch (err) {
                console.error('Preview error:', err);
            }
        };

        this.updatePreview = updatePreview;

        const inputs = [
            'enable-social', 'aspect-ratio', 'bg-type', 'qr-title', 'show-link', 'transparent-bg'
        ];
        inputs.forEach(id => {
            document.getElementById(id)?.addEventListener('change', updatePreview);
            document.getElementById(id)?.addEventListener('input', updatePreview);
        });
        
        document.getElementById('links-input')?.addEventListener('input', () => {
            clearTimeout(this.previewTimeout);
            this.previewTimeout = setTimeout(updatePreview, 500);
        });

        this.renderGradientPresets();
    },

    renderGradientPresets: function() {
        const container = document.getElementById('gradient-options');
        if (!container) return;

        this.gradients = [
            ['oklch(0.65 0.2 20)', 'oklch(0.75 0.2 60)'],
            ['oklch(0.7 0.1 250)', 'oklch(0.8 0.15 320)'],
            ['oklch(0.75 0.15 140)', 'oklch(0.85 0.15 80)'],
            ['oklch(0.6 0.15 250)', 'oklch(0.6 0.15 200)'],
            ['oklch(0.4 0.1 280)', 'oklch(0.6 0.15 320)'],
            ['oklch(0.8 0.1 80)', 'oklch(0.9 0.1 100)'],
            ['oklch(0.3 0.05 250)', 'oklch(0.2 0.05 250)'],
            ['oklch(0.9 0.05 180)', 'oklch(0.8 0.1 200)'],
        ];

        if (this.selectedGradientIndex === undefined) {
            this.selectedGradientIndex = 1;
        }

        container.innerHTML = '';
        this.gradients.forEach((grad, index) => {
            const btn = document.createElement('button');
            btn.className = `w-8 h-8 rounded-full border-2 transition-all ${index === this.selectedGradientIndex ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}`;
            btn.style.background = `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`;
            
            btn.onclick = () => {
                this.selectedGradientIndex = index;
                this.renderGradientPresets();
                if (this.updatePreview) this.updatePreview();
            };
            container.appendChild(btn);
        });
    },

    onLanguageChange: function() {
        if (this.processedQRs.length > 0) this.renderResults();
    },

    handleGenerate: async function() {
        const linksInput = document.getElementById('links-input');
        const transparentBg = document.getElementById('transparent-bg');
        if (!linksInput) return;

        const text = linksInput.value.trim();
        if (!text) {
            App.showToast(App.t('msg_enter_links') || 'Please enter at least one link.');
            return;
        }

        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return;

        const enableSocial = document.getElementById('enable-social')?.checked;
        const aspectRatioVal = document.getElementById('aspect-ratio')?.value || '1:1';
        const bgTypeVal = document.getElementById('bg-type')?.value || 'gradient';
        const titleText = document.getElementById('qr-title')?.value || '';
        const showLink = document.getElementById('show-link')?.checked;

        const isTransparent = transparentBg && transparentBg.checked;
        const bgOption = isTransparent ? '#00000000' : '#ffffff';

        // UI Setup
        document.getElementById('empty-state')?.classList.add('hidden');
        document.getElementById('results-section')?.classList.remove('hidden');
        
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('processing-bar');
        
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';

        this.processedQRs = [];
        let processed = 0;

        for (const line of lines) {
            try {
                const name = getValidFilename(line);
                
                // SVG String
                const svgString = await QRCode.toString(line, {
                    type: 'svg',
                    color: { light: bgOption, dark: '#000000' },
                    margin: 1
                });
                
                // PNG Data URL
                const rawPngUrl = await QRCode.toDataURL(line, {
                    type: 'image/png',
                    color: { light: bgOption, dark: '#000000' },
                    margin: 2,
                    width: enableSocial ? 600 : 512
                });
                
                let finalPngUrl = rawPngUrl;
                if (enableSocial) {
                    finalPngUrl = await this.generateSocialImage(rawPngUrl, aspectRatioVal, bgTypeVal, titleText, showLink, line);
                }
                
                this.processedQRs.push({
                    content: line,
                    name: name,
                    svg: svgString,
                    png: finalPngUrl,
                    isSocial: !!enableSocial,
                    isTransparent: isTransparent
                });

                processed++;
                if (progressBar) progressBar.style.width = `${(processed / lines.length) * 100}%`;
                
                await new Promise(r => setTimeout(r, 0));
            } catch (err) {
                console.error(err);
            }
        }

        this.renderResults();
        
        setTimeout(() => {
            if (progressContainer) progressContainer.classList.add('hidden');
        }, 500);

        App.fireConfetti();
    },

    generateSocialImage: function(qrDataUrl, ratio, bgType, titleText, showLink, linkText) {
        return new Promise((resolve) => {
            const dimensions = {
                '1:1': { w: 1080, h: 1080 },
                '4:5': { w: 1080, h: 1350 },
                '16:9': { w: 1200, h: 675 },
                '9:16': { w: 1080, h: 1920 }
            };
            const dim = dimensions[ratio] || dimensions['1:1'];
            
            const canvas = document.createElement('canvas');
            canvas.width = dim.w;
            canvas.height = dim.h;
            const ctx = canvas.getContext('2d');

            const drawQR = () => {
                const img = new Image();
                img.onload = () => {
                    const qrSize = Math.min(dim.w, dim.h) * 0.5;
                    
                    ctx.shadowColor = 'rgba(0,0,0,0.15)';
                    ctx.shadowBlur = 40;
                    ctx.shadowOffsetY = 10;
                    
                    ctx.fillStyle = '#ffffff';
                    const padding = 40;
                    const rectSize = qrSize + padding * 2;
                    const rectX = (dim.w - rectSize) / 2;
                    const rectY = (dim.h - rectSize) / 2;
                    
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(rectX, rectY, rectSize, rectSize, 32);
                    } else {
                        ctx.rect(rectX, rectY, rectSize, rectSize);
                    }
                    ctx.fill();
                    
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetY = 0;
                    
                    ctx.drawImage(img, (dim.w - qrSize) / 2, (dim.h - qrSize) / 2, qrSize, qrSize);

                    const drawTextPill = (text, y, fontSize, isBottom) => {
                        const isArabic = /^[\s\W\d]*[\u0600-\u06FF]/.test(text);
                        ctx.direction = isArabic ? 'rtl' : 'ltr';
                        ctx.font = `bold ${fontSize}px 'IBM Plex Sans Arabic', Inter, sans-serif`;
                        
                        const textMetrics = ctx.measureText(text);
                        const textWidth = textMetrics.width;
                        const paddingX = fontSize * 1.2;
                        const paddingY = fontSize * 0.6;
                        const pillWidth = textWidth + paddingX * 2;
                        const pillHeight = fontSize + paddingY * 2;
                        const pillX = (dim.w - pillWidth) / 2;
                        const pillY = isBottom ? y : y - pillHeight;

                        ctx.shadowColor = 'rgba(0,0,0,0.2)';
                        ctx.shadowBlur = 20;
                        ctx.shadowOffsetY = 10;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.beginPath();
                        if (ctx.roundRect) {
                            ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
                        } else {
                            ctx.rect(pillX, pillY, pillWidth, pillHeight);
                        }
                        ctx.fill();

                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetY = 0;
                        
                        ctx.fillStyle = '#ffffff';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(text, dim.w / 2, pillY + pillHeight / 2 + (fontSize * 0.05));
                        
                        ctx.direction = 'ltr'; // reset
                    };

                    if (titleText) {
                        const fontSize = Math.floor(dim.w * 0.06);
                        drawTextPill(titleText, rectY - 40, fontSize, false);
                    }

                    if (showLink && linkText) {
                        const fontSize = Math.floor(dim.w * 0.035);
                        const cleanLink = linkText.replace(/^https?:\/\//, '').replace(/\/$/, '');
                        drawTextPill(cleanLink, rectY + rectSize + 40, fontSize, true);
                    }

                    resolve(canvas.toDataURL('image/png'));
                };
                img.src = qrDataUrl;
            };

            if (bgType === 'image' && this.customBgImage) {
                const bgImg = new Image();
                bgImg.onload = () => {
                    const scale = Math.max(dim.w / bgImg.width, dim.h / bgImg.height);
                    const x = (dim.w / 2) - (bgImg.width / 2) * scale;
                    const y = (dim.h / 2) - (bgImg.height / 2) * scale;
                    ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
                    drawQR();
                };
                bgImg.onerror = () => {
                    this.drawGradientBg(ctx, dim);
                    drawQR();
                };
                bgImg.src = this.customBgImage;
            } else {
                this.drawGradientBg(ctx, dim);
                drawQR();
            }
        });
    },

    drawGradientBg: function(ctx, dim) {
        const gradColors = this.gradients[this.selectedGradientIndex] || this.gradients[1];
        const gradient = ctx.createLinearGradient(0, 0, dim.w, dim.h);
        gradient.addColorStop(0, gradColors[0]);
        gradient.addColorStop(1, gradColors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, dim.w, dim.h);
    },

    renderResults: function() {
        const grid = document.getElementById('results-grid');
        if (!grid) return;

        grid.innerHTML = '';
        this.processedQRs.forEach((qr, index) => {
            const card = document.createElement('div');
            card.className = 'shadcn-card p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300';
            card.style.animationDelay = `${index * 50}ms`;
            
            const bgClass = qr.isSocial ? 'bg-zinc-900 border border-zinc-800' : (qr.isTransparent ? 'bg-checkered' : 'bg-white');
            const imgClass = qr.isSocial ? 'w-full h-full object-contain rounded-lg' : 'w-full h-full object-contain';

            card.innerHTML = `
                <div class="aspect-square rounded-xl ${bgClass} p-4 flex items-center justify-center shadow-inner group relative overflow-hidden">
                    <img src="${qr.png}" class="${imgClass}">
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                         <button class="btn-dl-png shadcn-button shadcn-button-primary h-8 px-4 text-[10px] gap-2 w-32 justify-center">
                            <i data-lucide="image" class="w-3 h-3"></i>
                            <span>PNG</span>
                        </button>
                        <button class="btn-dl-svg shadcn-button shadcn-button-outline h-8 px-4 text-[10px] gap-2 w-32 justify-center bg-white/10 text-white border-white/20">
                            <i data-lucide="file-code" class="w-3 h-3"></i>
                            <span>SVG (Vector)</span>
                        </button>
                    </div>
                </div>
                <div class="space-y-1 text-center">
                    <p class="text-[10px] font-bold text-white truncate max-w-full">${qr.name}</p>
                    <p class="text-[8px] text-zinc-600 truncate">${qr.content}</p>
                </div>
            `;

            card.querySelector('.btn-dl-png').onclick = () => App.downloadFile(qr.png, `${qr.name}.png`, 'image/png');
            card.querySelector('.btn-dl-svg').onclick = () => App.downloadFile(qr.svg, `${qr.name}.svg`, 'image/svg+xml');
            grid.appendChild(card);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons({ icons: lucide.icons });
        App.translatePage();
    },

    downloadZip: async function() {
        if (!this.processedQRs.length) return;
        
        const zip = new JSZip();
        this.processedQRs.forEach(qr => {
            const pngBase64 = qr.png.split(',')[1];
            zip.file(`${qr.name}.png`, pngBase64, { base64: true });
            zip.file(`${qr.name}.svg`, qr.svg);
        });

        const content = await zip.generateAsync({ type: "blob" });
        App.downloadFile(content, 'qr-codes.zip', 'application/zip');
        App.fireConfetti();
    }
});
