// Service Worker — Fórmulas Clínicas
//
// Qué hace este archivo:
// 1) La primera vez que se abre la app con internet, guarda una copia
//    local (en el teléfono) de todos los archivos que necesita para
//    funcionar: HTML, CSS, JS, íconos y manifest.
// 2) De ahí en adelante, cuando se abre la app SIN internet, el
//    navegador lee esos archivos guardados en vez de intentar
//    descargarlos — por eso ya no truena sin señal.
// 3) Las fuentes de Google Fonts se guardan "al vuelo": la primera
//    vez que carguen se cachean, después ya no se vuelven a pedir.

// IMPORTANTE PARA FUTURAS ACTUALIZACIONES:
// Cada vez que subas cambios a app.js, formulas.js, estilos.css o
// index.html, sube también el número de esta versión (v1 -> v2, etc.)
// Si no lo subes, los teléfonos que ya tienen la app guardada van a
// seguir viendo la versión vieja aunque tú ya hayas actualizado GitHub.
const VERSION = 'v1';

const CACHE_APP = `formulas-clinicas-${VERSION}`;
const CACHE_FUENTES = `formulas-clinicas-fuentes-${VERSION}`;

// Archivos propios de la app (mismo dominio) que se guardan de una vez
// al instalar el service worker.
const ARCHIVOS_PROPIOS = [
  './',
  './index.html',
  './app.js',
  './formulas.js',
  './estilos.css',
  './manifest.json',
  './icono-32.png',
  './icono-180.png',
  './icono-192.png',
  './icono-512.png'
];

// ---------- INSTALL: guarda los archivos propios ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_APP).then((cache) => cache.addAll(ARCHIVOS_PROPIOS))
  );
  self.skipWaiting();
});

// ---------- ACTIVATE: borra cachés de versiones viejas ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_APP && nombre !== CACHE_FUENTES)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

// ---------- FETCH: decide de dónde servir cada archivo ----------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const esFuenteGoogle =
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com';

  if (esFuenteGoogle) {
    // Fuentes: intenta guardarlas la primera vez que se piden;
    // si ya están guardadas, se sirven directo desde el teléfono.
    event.respondWith(
      caches.open(CACHE_FUENTES).then((cache) =>
        cache.match(event.request).then((respuestaGuardada) => {
          if (respuestaGuardada) return respuestaGuardada;
          return fetch(event.request).then((respuestaRed) => {
            cache.put(event.request, respuestaRed.clone());
            return respuestaRed;
          });
        })
      )
    );
    return;
  }

  // Archivos propios de la app: primero busca en lo guardado
  // (para que abra al instante y funcione sin señal); si no lo
  // encuentra ahí, intenta traerlo de internet.
  event.respondWith(
    caches.match(event.request).then((respuestaGuardada) => {
      return respuestaGuardada || fetch(event.request);
    })
  );
});
