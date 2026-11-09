const CACHE='atlas-v10';
const SHELL=['./','index.html','manifest.webmanifest','atlas-192.png','atlas-512.png'];
const REMOTE=['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'];

self.addEventListener('install',e=>{
  /* cache each file on its own so a missing icon never blocks the install */
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
  const own=u.origin===location.origin;
  if(!own && REMOTE.indexOf(u.hostname)<0) return;

  if(own){
    /* the app's own files: newest version first, saved copy only if offline or very slow */
    const key=u.origin+u.pathname;
    e.respondWith(caches.open(CACHE).then(async c=>{
      const net=fetch(r,{cache:'no-cache'}).then(res=>{ if(res&&res.ok) c.put(key,res.clone()); return res; });
      const slow=new Promise(res=>setTimeout(()=>res(null),5000));
      try{
        const res=await Promise.race([net,slow]);
        if(res) return res;
      }catch(_){}
      const hit=await c.match(key);
      if(hit){ e.waitUntil(net.catch(()=>{})); return hit; }
      try{ return await net; }catch(_){}
      if(r.mode==='navigate'){ const home=await c.match('index.html'); if(home) return home; }
      return new Response('',{status:504});
    }));
    return;
  }

  /* fonts and libraries: saved copy first, refreshed in the background */
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(r);
    const net=fetch(r).then(res=>{ if(res&&(res.ok||res.type==='opaque')) c.put(r,res.clone()); return res; }).catch(()=>null);
    if(hit){ e.waitUntil(net); return hit; }
    const res=await net;
    return res||new Response('',{status:504});
  }));
});
