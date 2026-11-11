// ASCEND : service worker. Garde l'app disponible hors ligne et affiche les rappels.
// Réseau d'abord : en ligne, on reçoit toujours la dernière version ; hors ligne, la copie en cache prend le relais.
// À chaque nouvelle version de l'app, changer le nom du cache ci-dessous.
const CACHE = 'ascend-22';
const FICHIERS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icones/icone-192.png',
  './icones/icone-512.png',
  './icones/icone-maskable-512.png',
  './icones/apple-touch-icon.png',
  './icones/favicon-32.png'
];

self.addEventListener('install', e => {
  // « reload » : les copies viennent du serveur, pas du cache du navigateur (GitHub Pages le garde 10 min)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // Ne touche qu'aux caches d'ASCEND (Guts vit sur la même origine)
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k.startsWith('ascend-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith(
    // « no-cache » : toujours demander au serveur si la page a changé (sinon le navigateur ressert une copie de 10 min)
    fetch(req, { cache: 'no-cache' })
      .then(rep => {
        if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
        return rep;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});

// Rappels : le service envoie { titre, corps, tag }. iOS exige qu'une notification soit toujours affichée.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { corps: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titre || 'ASCEND', {
    body: d.corps || '',
    tag: d.tag || undefined,
    icon: 'icones/icone-192.png',
    badge: 'icones/icone-192.png',
    data: { url: './' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(liste => {
    const ouvert = liste.find(c => 'focus' in c && new URL(c.url).pathname.startsWith(new URL(self.registration.scope).pathname));
    return ouvert ? ouvert.focus() : self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
