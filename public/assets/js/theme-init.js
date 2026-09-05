/* Runs before first paint: restore a saved dark theme so the page never
   flashes white on the way in. The toggle itself lives in site-header.js. */
(function(){try{var t=localStorage.getItem('pu-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();
