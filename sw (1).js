const CACHE='atlas-v8';
const SHELL=['./','index.html','manifest.webmanifest','atlas-192.png','atlas-512.png'];
const REMOTE=['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'];

self.addEventListener('install',e=>{
  /* cache each file on its own so a missing icon never blocks the install */
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
  const own=u.origin===location.origin;
  if(!own && REMOTE.indexOf(u.hostname)<0) return;
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(r,{ignoreSearch:own});
    const net=fetch(r).then(res=>{ if(res&&(res.ok||res.type==='opaque')) c.put(r,res.clone()); return res; }).catch(()=>null);
    if(hit){ e.waitUntil(net); return hit; }
    const res=await net;
    if(res) return res;
    if(r.mode==='navigate'){ const home=await c.match('index.html'); if(home) return home; }
    return new Response('',{status:504});
  }));
});
