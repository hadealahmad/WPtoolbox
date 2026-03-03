const CACHE_NAME = 'wptoolbox-v6';
const ASSETS = [
    './',
    './index.html',
    './awesomestack.html',
    './img2webp.html',
    './clearfonts.html',
    './snippets.html',
    './wp-mapper.html',
    './tips.html',
    './favicon.svg',
    './css/globals.css',
    './js/core.js',
    './js/data/translations.json',
    './js/data/nav.json',
    './js/data/stack-config.json',
    './js/snippets.js',
    './js/tips.js',
    './js/image-converter.js',
    './js/wp-mapper.js',
    './js/awesome-stack.js',
    './js/font-cleaner.js',
    './js/data/snippets.json',
    './js/data/tips.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
