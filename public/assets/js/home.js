/* PocketUniversity.AI — home page behaviour: the card videos, the rail
 * arrows, the popup player and the news signup. The same wiring as the
 * OttomanLabs.AI homepage, so both sites behave alike. */

/* card videos — hover to play on desktop, fully-in-view on touch */
(function(){
  var vids = document.querySelectorAll('.vwrap video');
  if(!vids.length) return;
  var hoverFine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  for(var i = 0; i < vids.length; i++){
    (function(v){
      v.muted = true;
      var card = v.closest('.rcard') || v;
      function play(){ var p = v.play(); if(p && p.catch) p.catch(function(){}); }
      if(hoverFine){
        card.addEventListener('mouseenter', play);
        card.addEventListener('mouseleave', function(){ v.pause(); });
      } else if('IntersectionObserver' in window){
        new IntersectionObserver(function(es){
          for(var j = 0; j < es.length; j++){
            var e = es[j], need = .98;
            if(e.rootBounds && e.boundingClientRect.width > e.rootBounds.width){
              need = Math.max(.35, (e.rootBounds.width / e.boundingClientRect.width) * .92);
            }
            e.intersectionRatio >= need ? play() : v.pause();
          }
        }, {threshold:[0, .1, .2, .3, .4, .5, .6, .7, .8, .9, .98]}).observe(card);
      } else {
        play();
      }
    })(vids[i]);
  }
})();

/* the rails — the round arrows page each row sideways */
(function(){
  "use strict";
  var wraps = document.querySelectorAll('.rail-wrap');
  for(var i = 0; i < wraps.length; i++){
    (function(wrapEl){
      var rail = wrapEl.querySelector('.rail');
      var prev = wrapEl.querySelector('.rarrow.prev');
      var next = wrapEl.querySelector('.rarrow.next');
      function page(dir){ rail.scrollBy({ left: dir * rail.clientWidth * 0.85, behavior: 'smooth' }); }
      if(prev) prev.addEventListener('click', function(){ page(-1); });
      if(next) next.addEventListener('click', function(){ page(1); });
    })(wraps[i]);
  }
})();

/* the popup player — Watch the video buttons */
(function(){
  "use strict";
  var modal = document.getElementById('vModal');
  if(!modal) return;
  var vid = document.getElementById('vmVideo');
  var title = document.getElementById('vmTitle');
  function open(base, name){
    title.textContent = name;
    while(vid.firstChild) vid.removeChild(vid.firstChild);
    var s1 = document.createElement('source'); s1.src = base + '.mp4'; s1.type = 'video/mp4';
    var s2 = document.createElement('source'); s2.src = base + '.webm'; s2.type = 'video/webm';
    vid.appendChild(s1); vid.appendChild(s2);
    vid.load();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var p = vid.play(); if(p && p.catch) p.catch(function(){});
  }
  function close(){
    vid.pause();
    while(vid.firstChild) vid.removeChild(vid.firstChild);
    vid.load();
    modal.hidden = true;
    document.body.style.overflow = '';
  }
  var opens = document.querySelectorAll('.vopen');
  for(var i = 0; i < opens.length; i++)(function(b){
    b.addEventListener('click', function(){
      open(b.getAttribute('data-full'), b.getAttribute('data-vtitle'));
    });
  })(opens[i]);
  document.getElementById('vmClose').addEventListener('click', close);
  modal.querySelector('.vmodal-back').addEventListener('click', close);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && !modal.hidden) close();
  });
  document.getElementById('vmFull').addEventListener('click', function(){
    if(vid.requestFullscreen) vid.requestFullscreen();
    else if(vid.webkitEnterFullscreen) vid.webkitEnterFullscreen();
    else if(vid.webkitRequestFullscreen) vid.webkitRequestFullscreen();
  });
})();

/* the news coupon in The Studio */
(function(){
  "use strict";
  /* Signups prefer /api/subscribe on this domain — the first-party relay
     the OttomanLabs.AI site runs, immune to ad-blockers. This site is
     static assets only, so that endpoint answers 404 here and the signup
     carries on through Mailchimp's JSONP endpoint directly; ad-blockers
     may stop that hop, and the note says so. Deploy the relay Worker
     alongside these assets and the first hop starts working unchanged. */
  var MC_FALLBACK = 'https://moneyafterdark.us17.list-manage.com/subscribe/post-json?u=9a95e7b3013f3d844b00eb3f0&id=d15601aa5d&f_id=00cccae3f0&b_9a95e7b3013f3d844b00eb3f0_d15601aa5d=';
  function subscribeJsonp(email, done){
    var cb = 'mc' + Math.floor(Math.random() * 1e9);
    var tag = document.createElement('script');
    var timer = setTimeout(function(){ cleanup(); done(false, ''); }, 8000);
    function cleanup(){ clearTimeout(timer); delete window[cb]; if(tag.parentNode) tag.parentNode.removeChild(tag); }
    window[cb] = function(res){ cleanup(); done(res && res.result === 'success', (res && res.msg) || ''); };
    tag.onerror = function(){ cleanup(); done(false, '__blocked__'); };
    tag.src = MC_FALLBACK + '&EMAIL=' + encodeURIComponent(email) + '&c=' + cb;
    document.body.appendChild(tag);
  }
  function subscribe(email, done){
    var called = false;
    function once(ok, msg){ if(!called){ called = true; done(ok, msg); } }
    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    })
    .then(function(r){
      return r.json().then(
        function(res){ once(!!res.ok, res.msg || ''); },
        function(){
          if(r.status === 404 || r.status === 405) subscribeJsonp(email, once);
          else once(false, '__http_' + r.status);
        }
      );
    })
    .catch(function(){ subscribeJsonp(email, once); });
  }
  function mcFail(msg){
    if(msg === '__blocked__') return 'Blocked in this browser — pause the ad-blocker and retry, or <a href="https://eepurl.com/ieW19L" target="_blank" rel="noopener">sign up on the direct form</a>.';
    if(/^__http_/.test(msg)) return 'The signup service answered with an error (HTTP ' + msg.slice(7) + ') — tell the site owner.';
    var t = msg && String(msg).replace(/<[^>]*>/g, '').replace(/^\d+\s*-\s*/, '').trim();
    if(t && /already subscribed/i.test(t)) return 'You’re already on the list — nothing to do.';
    if(!t && msg) return 'Mailchimp rejected the signup — no reason given.';
    return (t && t.slice(0, 140)) || 'That didn’t go through — try again in a moment.';
  }

  var form = document.getElementById('newsForm');
  if(form) form.addEventListener('submit', function(e){
    e.preventDefault();
    var email = document.getElementById('newsEmail');
    if (!email.value || !email.checkValidity()){ email.focus(); return; }
    subscribe(email.value, function(ok, msg){
      var okEl = document.getElementById('newsOk');
      if(ok){
        form.style.display = 'none';
        okEl.textContent = 'NOTED — THANK YOU';
        try{ localStorage.setItem('pu-nl', JSON.stringify({ k:'done' })); }catch(err){}
      } else {
        okEl.innerHTML = mcFail(msg);
      }
      okEl.style.display = 'block';
    });
  });
})();
