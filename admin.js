(() => {
  window.addEventListener('message',event=>{if(/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(event.origin)&&event.data==='rc-service-hello')event.source?.postMessage('rc-service-trusted',event.origin);});
  const status=document.getElementById('admin-status'),frame=document.getElementById('admin-frame'),link=document.getElementById('admin-direct');
  try{
    const url=new URL(window.RC_SUPPORT?.webAppUrl);
    if(url.origin!=='https://script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname))throw new Error();
    url.searchParams.set('view','admin');frame.src=url.href;frame.hidden=false;link.href=url.href;link.hidden=false;
    status.textContent='Enter your admin PIN below. Reloading this page signs you out.';
  }catch{status.textContent='The service hub is not connected yet. Complete the Apps Script setup in ADMIN-SETUP.md.';}
})();
