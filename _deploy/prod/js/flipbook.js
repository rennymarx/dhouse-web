/* dhouse.cz - listovaci prohlizec katalogu
 * ------------------------------------------------------------------
 * Samostatny modul, aktivuje se jen na strankach, kde je [data-flipbook].
 * PDF NERENDERUJE - listuje predrenderovane obrazky stran (viz _tools/build-katalogy.py).
 * Stejny princip jako epaper vyrobce: rychle i na mobilu, plne PDF je jen ke stazeni.
 *
 * Swipe zajistuje nativni CSS scroll-snap, ne vlastni touch matematika.
 * Obrazky mimo okno +-4 strany se uvolnuji - 96 dekodovanych stran by jinak
 * na mobilu snedlo stovky MB pameti (nativni loading="lazy" nikdy neuvolnuje).
 */
(function () {
  'use strict';

  var cards = document.querySelectorAll('[data-flipbook]');
  if (!cards.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LOAD = 2;   // kolik stran kolem aktualni drzet nactene
  var KEEP = 4;   // za touto hranici se src uvolni (hystereze pri rychlem swipu)

  function pad(n, w) { var s = String(n); while (s.length < w) { s = '0' + s; } return s; }

  function parse(el) {
    var widths = (el.getAttribute('data-fb-widths') || '').split(',')
      .map(function (s) { return parseInt(s, 10); })
      .filter(function (n) { return n > 0; })
      .sort(function (a, b) { return a - b; });
    return {
      el: el,
      id: el.getAttribute('data-flipbook'),
      title: el.getAttribute('data-fb-title') || 'Katalog',
      pages: parseInt(el.getAttribute('data-fb-pages'), 10) || 0,
      pattern: el.getAttribute('data-fb-pattern') || '',
      ratio: parseFloat(el.getAttribute('data-fb-ratio')) || 0.7071,
      pdf: el.getAttribute('data-fb-pdf') || '',
      widths: widths.length ? widths : [1400]
    };
  }

  var books = Array.prototype.map.call(cards, parse).filter(function (b) {
    return b.pages > 0 && b.pattern.indexOf('{n}') > -1 && b.pattern.indexOf('{w}') > -1;
  });
  if (!books.length) return;

  function urlFor(b, i, w) {
    return b.pattern.replace('{n}', pad(i, 3)).replace('{w}', String(w));
  }

  // modul zije -> odkryj JS-only ovladani (bez JS zustane jen odkaz na PDF)
  document.documentElement.classList.add('fb-ready');

  var ui = null, cur = null, page = 0, lastFocus = null, pushed = false, inerted = [];
  var prevOverflow = '';

  /* ---------------------------------------------------------- overlay */

  function build() {
    var r = document.createElement('div');
    r.className = 'fb';
    r.setAttribute('role', 'dialog');
    r.setAttribute('aria-modal', 'true');
    r.setAttribute('aria-labelledby', 'fbTitle');
    r.innerHTML =
      '<div class="fb__bar">' +
        '<p class="fb__title" id="fbTitle"></p>' +
        '<div class="fb__tools">' +
          '<a class="fb__btn fb__pdf" href="#" download>Stáhnout PDF</a>' +
          '<button class="fb__btn fb__fs" type="button" aria-pressed="false">Celá obrazovka</button>' +
          '<button class="fb__btn fb__close" type="button" aria-label="Zavřít prohlížeč katalogu">Zavřít ×</button>' +
        '</div>' +
      '</div>' +
      '<div class="fb__stage">' +
        '<div class="fb__track" tabindex="0" aria-label="Stránky katalogu — listujte šipkami vlevo a vpravo nebo přejetím prstu"></div>' +
        '<button class="fb__nav fb__nav--prev" type="button" aria-label="Předchozí strana"><span aria-hidden="true">‹</span></button>' +
        '<button class="fb__nav fb__nav--next" type="button" aria-label="Další strana"><span aria-hidden="true">›</span></button>' +
      '</div>' +
      '<div class="fb__foot">' +
        '<span class="fb__counter" aria-hidden="true"><b>1</b><span> / </span><i>1</i></span>' +
        '<input class="fb__scrub" type="range" min="1" max="1" value="1" step="1" aria-label="Přejít na stranu" />' +
        '<p class="fb__status sr-only" role="status" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(r);

    ui = {
      root: r,
      title: r.querySelector('.fb__title'),
      pdf: r.querySelector('.fb__pdf'),
      fs: r.querySelector('.fb__fs'),
      close: r.querySelector('.fb__close'),
      track: r.querySelector('.fb__track'),
      prev: r.querySelector('.fb__nav--prev'),
      next: r.querySelector('.fb__nav--next'),
      cnum: r.querySelector('.fb__counter b'),
      ctot: r.querySelector('.fb__counter i'),
      scrub: r.querySelector('.fb__scrub'),
      status: r.querySelector('.fb__status'),
      imgs: []
    };

    ui.close.addEventListener('click', function () { closeFb(false); });
    ui.prev.addEventListener('click', function () { goTo(page - 1, true); });
    ui.next.addEventListener('click', function () { goTo(page + 1, true); });
    ui.scrub.addEventListener('input', function () { goTo(parseInt(ui.scrub.value, 10), false); });
    ui.fs.addEventListener('click', toggleFs);
    if (!fsEnabled()) { ui.fs.hidden = true; }

    // aktualni strana ze scrollu (swipe / trackpad), throttle pres rAF
    var raf = 0;
    ui.track.addEventListener('scroll', function () {
      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        raf = 0;
        if (!cur) return;
        var w = ui.track.clientWidth;
        if (!w) return;
        setPage(Math.round(ui.track.scrollLeft / w) + 1);
      });
    }, { passive: true });

    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
  }

  function buildTrack(b) {
    ui.track.innerHTML = '';
    ui.track.style.setProperty('--fb-ratio', String(b.ratio));
    var frag = document.createDocumentFragment();
    for (var i = 1; i <= b.pages; i++) {
      var p = document.createElement('div');
      p.className = 'fb__page';
      var img = document.createElement('img');
      img.className = 'fb__img';
      img.alt = '';
      img.decoding = 'async';
      img.draggable = false;
      p.appendChild(img);
      frag.appendChild(p);
    }
    ui.track.appendChild(frag);
    ui.imgs = ui.track.querySelectorAll('.fb__img');
  }

  /* -------------------------------------------- okno nactenych stran */

  function syncWindow() {
    var lo = page - LOAD, hi = page + LOAD, kl = page - KEEP, kh = page + KEEP;
    for (var i = 1; i <= cur.pages; i++) {
      var img = ui.imgs[i - 1];
      if (!img) continue;
      if (i >= lo && i <= hi) {
        if (!img.getAttribute('src')) {
          var parts = [];
          for (var k = 0; k < cur.widths.length; k++) {
            parts.push(urlFor(cur, i, cur.widths[k]) + ' ' + cur.widths[k] + 'w');
          }
          img.setAttribute('sizes', '100vw');
          img.setAttribute('srcset', parts.join(', '));
          img.setAttribute('src', urlFor(cur, i, cur.widths[cur.widths.length - 1]));
          img.alt = cur.title + ', strana ' + i;
        }
      } else if (i < kl || i > kh) {
        if (img.getAttribute('src')) {
          img.removeAttribute('src');       // uvolni dekodovanou bitmapu
          img.removeAttribute('srcset');
          img.alt = '';
        }
      }
    }
  }

  /* ---------------------------------------------------------- navigace */

  function goTo(i, smooth) {
    if (!cur) return;
    i = Math.min(Math.max(1, i), cur.pages);
    var slide = ui.track.children[i - 1];
    if (!slide) return;
    setPage(i);
    var behavior = (smooth && !reduced) ? 'smooth' : 'auto';
    if (ui.track.scrollTo) {
      try { ui.track.scrollTo({ left: slide.offsetLeft, behavior: behavior }); }
      catch (e) { ui.track.scrollLeft = slide.offsetLeft; }
    } else {
      ui.track.scrollLeft = slide.offsetLeft;
    }
  }

  var annT = 0;
  function setPage(i) {
    if (!cur) return;
    i = Math.min(Math.max(1, i), cur.pages);
    if (i === page) return;
    page = i;
    ui.cnum.textContent = String(i);
    if (ui.scrub.value !== String(i)) { ui.scrub.value = String(i); }
    ui.prev.disabled = (i <= 1);
    ui.next.disabled = (i >= cur.pages);
    syncWindow();
    // debounce, at ctecka nedrmoli pri rychlem swipu
    window.clearTimeout(annT);
    annT = window.setTimeout(function () {
      if (cur) { ui.status.textContent = 'Strana ' + page + ' z ' + cur.pages; }
    }, 350);
  }

  function onKey(e) {
    if (!ui || !ui.root.classList.contains('is-open')) return;
    // range input si sipky obsluhuje sam
    if (e.target === ui.scrub && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    switch (e.key) {
      case 'Escape':
        if (fsEl()) return;                 // fullscreen ukonci prohlizec sam
        e.preventDefault(); closeFb(false); break;
      case 'ArrowRight': case 'PageDown':
        e.preventDefault(); goTo(page + 1, true); break;
      case 'ArrowLeft': case 'PageUp':
        e.preventDefault(); goTo(page - 1, true); break;
      case 'Home': e.preventDefault(); goTo(1, false); break;
      case 'End': e.preventDefault(); goTo(cur.pages, false); break;
      case 'Tab': trapTab(e); break;
    }
  }

  /* -------------------------------------------------------- fullscreen
     Zamerne na documentElement, ne na .fb: kdyby fullscreen dostal jen
     overlay, custom kurzor (dite <body>) by se nevykreslil, ale pravidlo
     body.has-cursor { cursor: none } by dal platilo -> neviditelny kurzor. */

  function fsEnabled() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); }
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function toggleFs() {
    var d = document, de = d.documentElement;
    try {
      if (fsEl()) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
      else { (de.requestFullscreen || de.webkitRequestFullscreen).call(de); }
    } catch (e) { /* nic */ }
  }
  function syncFs() {
    if (!ui) return;
    var on = !!fsEl();
    ui.fs.setAttribute('aria-pressed', on ? 'true' : 'false');
    ui.fs.textContent = on ? 'Zpět z celé obrazovky' : 'Celá obrazovka';
  }

  /* ------------------------------------------------------------ focus */

  var hasInert = ('inert' in HTMLElement.prototype);
  function setInert(on) {
    if (!hasInert) return;
    if (on) {
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el === ui.root || el.hasAttribute('inert')) return;
        el.setAttribute('inert', '');
        inerted.push(el);
      });
    } else {
      inerted.forEach(function (el) { el.removeAttribute('inert'); });
      inerted = [];
    }
  }
  function trapTab(e) {
    if (hasInert) return;                   // inert staci, trap netreba
    var f = Array.prototype.filter.call(
      ui.root.querySelectorAll('a[href], button:not([disabled]), input, [tabindex="0"]'),
      function (el) { return !el.hidden && el.offsetParent !== null; });
    if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    e.preventDefault();
    var n = e.shiftKey ? i - 1 : i + 1;
    if (n < 0) { n = f.length - 1; }
    if (n >= f.length) { n = 0; }
    f[n].focus();
  }

  /* ------------------------------------------------------ open / close */

  function openFb(b, start, trigger, fromHash) {
    if (!ui) build();
    cur = b;
    page = 0;
    lastFocus = trigger || document.activeElement;
    ui.title.textContent = b.title;
    ui.ctot.textContent = String(b.pages);
    ui.scrub.max = String(b.pages);
    if (b.pdf) { ui.pdf.href = b.pdf; ui.pdf.hidden = false; } else { ui.pdf.hidden = true; }
    buildTrack(b);
    ui.root.classList.add('is-open');
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setInert(true);
    goTo(start || 1, false);
    ui.close.focus();
    if (!fromHash) {
      try { history.pushState({ fb: b.id }, '', '#katalog=' + b.id); pushed = true; } catch (e) { /* nic */ }
    }
  }

  function closeFb(fromPop) {
    if (!ui || !ui.root.classList.contains('is-open')) return;
    if (fsEl()) { toggleFs(); }
    ui.root.classList.remove('is-open');
    ui.track.innerHTML = '';                // uvolni vsechny obrazky
    ui.imgs = [];
    cur = null;
    page = 0;
    setInert(false);
    document.body.style.overflow = prevOverflow;
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    if (pushed && !fromPop) {
      pushed = false;
      try { history.back(); } catch (e) { /* nic */ }
    } else {
      pushed = false;
    }
  }

  // Zavri jen tehdy, kdyz jsme stav sami pushnuli (tlacitko zpet na Androidu).
  // Bez teto podminky by stray popstate pri otevreni z odkazu #katalog=...
  // prohlizec okamzite zase zavrel.
  window.addEventListener('popstate', function () { if (pushed) { closeFb(true); } });

  /* -------------------------------------------- napojeni karet + odkaz */

  books.forEach(function (b) {
    var btn = b.el.querySelector('[data-fb-open]');
    if (btn) {
      btn.addEventListener('click', function (e) { e.preventDefault(); openFb(b, 1, btn); });
    }
    var cover = b.el.querySelector('.doccard__cover');
    if (cover) {
      cover.addEventListener('click', function () { openFb(b, 1, btn || cover); });
    }
  });

  var m = /(?:^|[#&])katalog=([a-z0-9\-]+)/i.exec(window.location.hash);
  if (m) {
    books.forEach(function (b) { if (b.id === m[1]) { openFb(b, 1, null, true); } });
  }

  window.dhouseFlipbook = {
    open: function (id, p) {
      books.forEach(function (b) { if (b.id === id) { openFb(b, p || 1, null); } });
    },
    close: function () { closeFb(false); }
  };
})();
