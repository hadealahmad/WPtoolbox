const CACHE_NAME = 'wptoolbox-v1';
const ASSETS = [
    './',
    './index.html',
    './awesomestack.html',
    './img2webp.html',
    './clearfonts.html',
    './xml2csv.html',
    './json2csv.html',
    './snippets.html',
    './tips.html',
    './favicon.svg',
    './css/globals.css',
    './js/core.js',
    './js/translations.json',
    './js/snippets.js',
    './js/image-converter.js',
    './js/awesome-stack.js',
    './js/snippets.json',
    './js/tips.json'
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
