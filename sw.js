// O cache guarda somente arquivos públicos do app, nunca registros pessoais.
const CACHE = 'acessivel-unilab-app-v1';
const FILES = [
  './', './index.html', './style.css', './script.js', './manifest.webmanifest',
  './assets/app-icon.svg', './assets/icon-192.png', './assets/icon-512.png',
  './assets/hero-accessibility.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('acessivel-unilab-app-') && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin) return;
  const allowed = FILES.map(file => new URL(file, scope).pathname);
  if (!allowed.includes(url.pathname)) return;
  // Primeiro consulta a rede para que novas versões publicadas sejam exibidas.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(url.pathname, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(url.pathname);
      if (cached) return cached;
      if (event.request.mode === 'navigate') return cache.match(new URL('./index.html', scope).pathname);
      throw error;
    }
  })());
});
