/* Service worker do painel. ESCOPO /app/ — registrado de dentro do painel
   com { scope: "/app/" } e servido com Service-Worker-Allowed: /app/.
   Na raiz ele cachearia as paginas de SEO e atrapalharia a revalidacao. */
const CACHE = "fisco-app-v1";
const CASCA = ["/app", "/app/mapa", "/app/teses"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (!url.pathname.startsWith("/app")) return;   // nunca toca na landing

  // Dado da API: rede primeiro, cache como rede de seguranca offline.
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Casca do app: cache primeiro.
  e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request)));
});

/* Alerta de publicacao nova do DJEN chega como push. */
self.addEventListener("push", (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.titulo || "fisco", {
    body: d.corpo || "", icon: "/icone-192.png", badge: "/icone-192.png",
    data: { url: d.url || "/app" }, tag: d.tag,
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data?.url || "/app"));
});
