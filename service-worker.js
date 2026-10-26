/* Noor Alhuda PWA service worker. Keep remote APIs/auth requests network-only. */
'use strict';
const CACHE_NAME = 'noor-alhuda-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try { await cache.add(new Request(path, { cache: 'reload' })); }
      catch (error) { console.warn('Could not precache:', path, error); }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('noor-alhuda-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Never cache cross-origin API, Quran, Firebase, analytics, or media requests.
  if (url.origin !== self.location.origin) return;
  // Network-first navigation allows GitHub Pages updates to appear; cached HTML is fallback offline.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('./index.html')) || (await cache.match('./')) || new Response('أنت غير متصل بالإنترنت. اتصل بالشبكة ثم أعد فتح منصة نور الهدى.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }
  // Cache-first only for same-origin static shell files.
  if (url.pathname.endsWith('/manifest.json') || /\/icons\/[^/]+\.png$/.test(url.pathname) || url.pathname.endsWith('/service-worker.js')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        fetch(request).then(response => { if (response.ok) cache.put(request, response.clone()); }).catch(() => {});
        return cached;
      }
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    })());
  }
});
