// CHANGE THIS VERSION NUMBER EVERY TIME YOU UPDATE THE SITE
const CACHE_NAME = 'minstay-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',  // Verify this matches your actual CSS filename
  '/script.js',  // Verify this matches your actual JS filename
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/privacy.html'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Activate Event (Cleans up old versions)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});
