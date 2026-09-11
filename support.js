(() => {
  window.addEventListener('message',event=>{if(/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(event.origin)&&event.data==='rc-service-hello')event.source?.postMessage('rc-service-trusted',event.origin);});
  const dialog=document.getElementById('feedback-dialog'),frame=document.getElementById('feedback-frame'),status=document.getElementById('feedback-status');
  document.getElementById('feedback-open').addEventListener('click',()=>{
    dialog.showModal();let target;
    try{target=new URL(window.RC_SUPPORT?.webAppUrl);if(target.origin!=='https://script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(target.pathname))throw new Error();}
    catch{status.textContent='Feedback is not connected yet. Please try again later.';frame.hidden=true;return;}
    target.searchParams.set('view','feedback');frame.src=target.href;frame.hidden=false;
    status.textContent='If Google’s form does not load, use the link below.';
    const link=document.getElementById('feedback-direct');link.href=target.href;link.hidden=false;
  });
  document.getElementById('feedback-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{frame.src='about:blank';});
})();
