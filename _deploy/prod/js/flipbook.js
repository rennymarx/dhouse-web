/* Doskroluje na #katalogy po nacteni rozvrzeni.
 * Proc: na /galerie je nad sekci 35 karet inspiraci. Prohlizec skoci na kotvu
 * driv, nez se jejich rozvrzeni dolozi, a sekce se pak posune o tisice pixelu
 * niz -- clovek z e-mailove kampane skonci uprostred galerie misto u katalogu.
 * Merene na mobilu: skok na 8045, sekce nakonec na 14215. */
(function () {
  'use strict';
  if (window.location.hash !== '#katalogy') return;
  function fix() {
    var el = document.getElementById('katalogy');
    if (!el) return;
    var top = el.getBoundingClientRect().top;
    if (Math.abs(top) > 120) { el.scrollIntoView({ block: 'start' }); }
  }
  window.addEventListener('load', function () {
    fix();
    window.setTimeout(fix, 250);
  });
})();

/* dhouse.cz - listovaci prohlizec katalogu
 * ------------------------------------------------------------------
 * Samostatny modul, aktivuje se jen na strankach, kde je [data-flipbook].
 * PDF NERENDERUJE - listuje predrenderovane obrazky stran (_tools/build-katalogy.py).
 *
 * Na siroke obrazovce zobrazuje DVOJSTRANU jako u fyzickeho katalogu
 * (obalka sama, pak 2-3, 4-5 ...), na uzke jednu stranu. Pri zmene sirky
 * se stopa prestavi a drzi aktualni stranu.
 *
 * Swipe zajistuje nativni CSS scroll-snap, ne vlastni touch matematika.
 * Obrazky mimo okno +-4 dvojstrany se uvolnuji - 96 dekodovanych stran by
 * na mobilu snedlo stovky MB (nativni loading="lazy" NIKDY neuvolnuje).
 */
(function () {
  'use strict';

  var cards = document.querySelectorAll('[data-flipbook]');
  if (!cards.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = window.matchMedia ? window.matchMedia('(min-width: 900px)') : null;
  var LOAD = 2;   // kolik dvojstran kolem aktualni drzet nactene
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

  /* Rozlozeni na dvojstrany jako u fyzickeho katalogu:
     [1], [2,3], [4,5], ... a posledni pripadne sama. */
  function computeSpreads(n, dbl) {
    var out = [], i;
    if (!dbl) {
      for (i = 1; i <= n; i++) { out.push([i]); }
      return out;
    }
    out.push([1]);
    for (i = 2; i <= n; i += 2) {
      out.push(i + 1 <= n ? [i, i + 1] : [i]);
    }
    return out;
  }

  document.documentElement.classList.add('fb-ready');

  var ui = null, cur = null, spreads = [], idx = -1, isDouble = false;
  var lastFocus = null, pushed = false, inerted = [], prevOverflow = '';

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
        '<span class="fb__counter" aria-hidden="true"></span>' +
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
      counter: r.querySelector('.fb__counter'),
      scrub: r.querySelector('.fb__scrub'),
      status: r.querySelector('.fb__status'),
      imgs: []
    };

    ui.close.addEventListener('click', function () { closeFb(false); });
    ui.prev.addEventListener('click', function () { goTo(idx - 1, true); });
    ui.next.addEventListener('click', function () { goTo(idx + 1, true); });
    ui.scrub.addEventListener('input', function () { goTo(parseInt(ui.scrub.value, 10) - 1, false); });
    ui.fs.addEventListener('click', toggleFs);
    if (!fsEnabled()) { ui.fs.hidden = true; }

    var raf = 0;
    ui.track.addEventListener('scroll', function () {
      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        raf = 0;
        if (!cur) return;
        var w = ui.track.clientWidth;
        if (!w) return;
        setIdx(Math.round(ui.track.scrollLeft / w));
      });
    }, { passive: true });

    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);

    // prepnuti mezi jednou stranou a dvojstranou pri zmene sirky okna
    if (wide) {
      var onWide = function () {
        if (!cur || !ui.root.classList.contains('is-open')) return;
        var keep = spreads[idx] ? spreads[idx][0] : 1;
        layout(cur, keep);
      };
      if (wide.addEventListener) { wide.addEventListener('change', onWide); }
      else if (wide.addListener) { wide.addListener(onWide); }
    }
  }

  /* Postavi stopu podle aktualniho rezimu a nastavi se na stranu `startPage`. */
  function layout(b, startPage) {
    isDouble = !!(wide && wide.matches);
    spreads = computeSpreads(b.pages, isDouble);

    ui.track.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var s = 0; s < spreads.length; s++) {
      var pg = document.createElement('div');
      pg.className = 'fb__page' + (spreads[s].length > 1 ? ' fb__page--double' : '');
      for (var k = 0; k < spreads[s].length; k++) {
        var img = document.createElement('img');
        img.className = 'fb__img';
        img.alt = '';
        img.decoding = 'async';
        img.draggable = false;
        pg.appendChild(img);
      }
      frag.appendChild(pg);
    }
    ui.track.appendChild(frag);
    ui.imgs = ui.track.querySelectorAll('.fb__img');

    ui.scrub.max = String(spreads.length);
    idx = -1;
    // najdi dvojstranu obsahujici pozadovanou stranu
    var target = 0;
    for (var i = 0; i < spreads.length; i++) {
      if (spreads[i].indexOf(startPage) > -1) { target = i; break; }
    }
    goTo(target, false);
  }

  /* ---------------------------------------------- okno nactenych stran */

  function syncWindow() {
    var lo = idx - LOAD, hi = idx + LOAD, kl = idx - KEEP, kh = idx + KEEP;
    var flat = 0;
    for (var s = 0; s < spreads.length; s++) {
      for (var k = 0; k < spreads[s].length; k++) {
        var img = ui.imgs[flat++];
        if (!img) continue;
        var n = spreads[s][k];
        if (s >= lo && s <= hi) {
          if (!img.getAttribute('src')) {
            var parts = [];
            for (var w = 0; w < cur.widths.length; w++) {
              parts.push(urlFor(cur, n, cur.widths[w]) + ' ' + cur.widths[w] + 'w');
            }
            img.setAttribute('sizes', isDouble ? '50vw' : '100vw');
            img.setAttribute('srcset', parts.join(', '));
            img.setAttribute('src', urlFor(cur, n, cur.widths[cur.widths.length - 1]));
            img.alt = cur.title + ', strana ' + n;
          }
        } else if (s < kl || s > kh) {
          if (img.getAttribute('src')) {
            img.removeAttribute('src');
            img.removeAttribute('srcset');
            img.alt = '';
          }
        }
      }
    }
  }

  /* ---------------------------------------------------------- navigace */

  function goTo(i, smooth) {
    if (!cur) return;
    i = Math.min(Math.max(0, i), spreads.length - 1);
    var slide = ui.track.children[i];
    if (!slide) return;
    setIdx(i);
    var behavior = (smooth && !reduced) ? 'smooth' : 'auto';
    if (ui.track.scrollTo) {
      try { ui.track.scrollTo({ left: slide.offsetLeft, behavior: behavior }); }
      catch (e) { ui.track.scrollLeft = slide.offsetLeft; }
    } else {
      ui.track.scrollLeft = slide.offsetLeft;
    }
  }

  function label(sp) {
    return sp.length > 1 ? (sp[0] + '–' + sp[1]) : String(sp[0]);
  }

  var annT = 0;
  function setIdx(i) {
    if (!cur) return;
    i = Math.min(Math.max(0, i), spreads.length - 1);
    if (i === idx) return;
    idx = i;
    var sp = spreads[i];
    ui.counter.innerHTML = '<b>' + label(sp) + '</b><span> / </span><i>' + cur.pages + '</i>';
    if (ui.scrub.value !== String(i + 1)) { ui.scrub.value = String(i + 1); }
    ui.prev.disabled = (i <= 0);
    ui.next.disabled = (i >= spreads.length - 1);
    syncWindow();
    window.clearTimeout(annT);
    annT = window.setTimeout(function () {
      if (cur) { ui.status.textContent = 'Strana ' + label(spreads[idx]) + ' z ' + cur.pages; }
    }, 350);
  }

  function onKey(e) {
    if (!ui || !ui.root.classList.contains('is-open')) return;
    if (e.target === ui.scrub && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    switch (e.key) {
      case 'Escape':
        if (fsEl()) return;
        e.preventDefault(); closeFb(false); break;
      case 'ArrowRight': case 'PageDown':
        e.preventDefault(); goTo(idx + 1, true); break;
      case 'ArrowLeft': case 'PageUp':
        e.preventDefault(); goTo(idx - 1, true); break;
      case 'Home': e.preventDefault(); goTo(0, false); break;
      case 'End': e.preventDefault(); goTo(spreads.length - 1, false); break;
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
    if (hasInert) return;
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

  function openFb(b, startPage, trigger, fromHash) {
    if (!ui) build();
    cur = b;
    lastFocus = trigger || document.activeElement;
    ui.title.textContent = b.title;
    if (b.pdf) { ui.pdf.href = b.pdf; ui.pdf.hidden = false; } else { ui.pdf.hidden = true; }
    ui.root.classList.add('is-open');
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setInert(true);
    layout(b, startPage || 1);
    ui.close.focus();
    if (!fromHash) {
      try { history.pushState({ fb: b.id }, '', '#katalog=' + b.id); pushed = true; } catch (e) { /* nic */ }
    }
  }

  function closeFb(fromPop) {
    if (!ui || !ui.root.classList.contains('is-open')) return;
    if (fsEl()) { toggleFs(); }
    ui.root.classList.remove('is-open');
    ui.track.innerHTML = '';
    ui.imgs = [];
    cur = null; spreads = []; idx = -1;
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

  // Zavri jen kdyz jsme stav sami pushnuli (tlacitko zpet na Androidu).
  // Bez teto podminky by stray popstate zavrel prohlizec otevreny z #katalog=...
  window.addEventListener('popstate', function () { if (pushed) { closeFb(true); } });

  /* ------------------------------------------- napojeni karet + odkaz */

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
