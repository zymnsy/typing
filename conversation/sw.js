const CACHE='conversation-studio-v5';
const FILES=['./','index.html','style.css?v=5','library.css?v=5','app.js?v=5','core.js?v=5','lessons.js?v=3','scenarios.js?v=3','directions.js?v=5','interview-notes.js?v=5','notes.js?v=5','score.js?v=3','records.js?v=5','scene-kuromon.png?v=3','icon.svg','manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.includes('/api/')||!FILES.some(file=>new URL(file,self.registration.scope).pathname===url.pathname))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
