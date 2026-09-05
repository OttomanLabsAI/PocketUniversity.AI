/* PocketUniversity.AI — the one site header.
 *
 * Renders the masthead into every page's <header class="masthead"> and owns
 * the light/dark toggle in a single place. Pages keep a static masthead in
 * their HTML as a no-JS fallback; this script replaces its contents at load
 * so the header is identical everywhere by construction.
 *
 * Order in the nav: Home · OttomanLabs.AI · Contact · Instagram × 2 · Dark.
 *
 * The toggle exposes window.__setTheme(mode) and window.__theme, persists to
 * localStorage 'pu-theme', and dispatches 'themechange' + 'resize' so every
 * canvas on every page can re-read its colour tokens. Page scripts must NOT
 * bind the toggle themselves — listen for 'themechange' instead.
 */
(function(){
  "use strict";

  var hd = document.querySelector('header.masthead');
  if(!hd) return;                       // pages that deliberately have no masthead

  var here = location.pathname.split('/').pop() || 'index.html';
  var LINKS = [
    { href: '/',                                 label: 'Home', page: 'index.html' },
    { href: 'https://ottomanlabs.ai/',           label: 'OttomanLabs.AI', ext: true },
    { href: 'https://ottomanlabs.ai/contact.html', label: 'Contact', ext: true }
  ];

  var IG = '<svg class="ig-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
    '<rect x="2.5" y="2.5" width="19" height="19" rx="5.2"/>' +
    '<circle cx="12" cy="12" r="4.6"/>' +
    '<circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none"/></svg>';

  var SPARK = 'M50 0C54 32 68 46 100 50 68 54 54 68 50 100 46 68 32 54 0 50 32 46 46 32 50 0Z';
  var SPARKS = '<svg class="sparks" viewBox="0 0 100 100" aria-hidden="true" fill="currentColor">' +
    '<path transform="translate(52 0) scale(0.30)" d="' + SPARK + '"/>' +
    '<path transform="translate(0 22) scale(0.60)" d="' + SPARK + '"/>' +
    '<path transform="translate(60 56) scale(0.40)" d="' + SPARK + '"/></svg>';

  hd.innerHTML =
    '<a class="brand" href="/" aria-label="PocketUniversity.AI home">PocketUniversity.AI' + SPARKS + '</a>' +
    '<nav class="nav-row" aria-label="Sections">' +
      LINKS.map(function(l){
        return '<a href="' + l.href + '"' +
               (l.page === here ? ' aria-current="page"' : '') +
               (l.ext ? ' target="_blank" rel="noopener"' : '') + '>' + l.label + '</a>';
      }).join('') +
      '<a class="ig-link" href="https://instagram.com/fid_900" target="_blank" rel="noopener" ' +
        'aria-label="Instagram — fid_900">' + IG + 'fid_900</a>' +
      '<a class="ig-link" href="https://instagram.com/ottomanlabs.ai" target="_blank" rel="noopener" ' +
        'aria-label="Instagram — ottomanlabs.ai">' + IG + 'ottomanlabs.ai</a>' +
      '<button class="theme-toggle" id="themeToggle" aria-pressed="false" title="Toggle light / dark">' +
        '<span class="th-dot" aria-hidden="true"></span><span id="themeLabel">Dark</span>' +
      '</button>' +
    '</nav>';

  /* ── the one theme wiring ── */
  var root = document.documentElement;
  var btn = document.getElementById('themeToggle');
  var lbl = document.getElementById('themeLabel');

  window.__setTheme = function(mode){
    var dark = (mode === 'dark');
    if(dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    lbl.textContent = dark ? 'Light' : 'Dark';
    window.__theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('pu-theme', window.__theme); } catch(e){}
    /* canvases cache CSS colours — tell every engine to re-read and redraw */
    window.dispatchEvent(new Event('themechange'));
    window.dispatchEvent(new Event('resize'));
  };

  var saved = false;
  try { saved = localStorage.getItem('pu-theme') === 'dark'; } catch(e){}
  window.__setTheme(saved ? 'dark' : 'light');

  btn.addEventListener('click', function(){
    window.__setTheme(window.__theme === 'dark' ? 'light' : 'dark');
  });
})();
