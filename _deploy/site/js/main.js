/* dhouse.cz — interakce. Vanilla JS, žádné závislosti.
 *  1) Mobilní hamburger menu
 *  2) Sticky nav scroll-aware (.nav-scrolled) + scroll progress
 *  3) Aktivní položka v navigaci podle pathname
 *  4) Galerie lightbox (klik na [data-lb])
 *  5) Scroll reveals (IntersectionObserver, třída .reveal)
 *  6) Proof bar — čísla se vynořují po znacích
 *  7) Lamelová galerie (slats) — tap na mobilu
 *  8) Magnetická tlačítka (.btn)
 *  9) Custom kurzor (brass tečka + kroužek, jen desktop)
 * Vše respektuje prefers-reduced-motion.
 */
(function () {
  'use strict';

  // pojistka pro inline fallback v index.html (reveal při selhání tohoto souboru)
  window.__dhouseMain = true;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 1) Mobile menu ---------- */
  var burger = document.getElementById('navBurger');
  var links = document.getElementById('navLinks');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        document.body.classList.remove('nav-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        document.body.classList.remove('nav-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 2) Sticky nav + scroll progress ---------- */
  var progress = document.createElement('div');
  progress.className = 'progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (y > 80) document.body.classList.add('nav-scrolled');
    else document.body.classList.remove('nav-scrolled');
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* ---------- 3) Active nav link by pathname ---------- */
  try {
    var path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    var navAnchors = document.querySelectorAll('.nav__links a[href]');
    Array.prototype.forEach.call(navAnchors, function (a) {
      var href = a.getAttribute('href').replace(/\.html$/, '').replace(/\/$/, '') || '/';
      if (href === path) a.setAttribute('aria-current', 'page');
    });
  } catch (e) { /* noop */ }

  /* ---------- 4) Lightbox pro galerii ---------- */
  var lbCards = document.querySelectorAll('[data-lb]');
  if (lbCards.length > 0) {
    // Galerijní karty: pozadí z data-lb (reálné foto místo gradientu placeholderu)
    Array.prototype.forEach.call(lbCards, function (el) {
      var media = el.querySelector('.gcard__media');
      var src = el.getAttribute('data-lb-src') || el.getAttribute('data-lb');
      if (media && src) {
        media.style.backgroundImage = "url('" + src + "')";
        media.style.backgroundSize = 'cover';
        media.style.backgroundPosition = 'center';
      }
    });

    var items = Array.prototype.map.call(lbCards, function (el) {
      return {
        src: el.getAttribute('data-lb-src') || el.getAttribute('data-lb'),
        caption: el.getAttribute('data-lb-caption') || '',
        group: el.getAttribute('data-lb-group') || 'default'
      };
    });

    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Zvětšený obrázek');
    lb.innerHTML =
      '<button class="lb__close" aria-label="Zavřít" type="button">Zavřít ×</button>' +
      '<button class="lb__prev" aria-label="Předchozí" type="button">‹ Předchozí</button>' +
      '<button class="lb__next" aria-label="Další" type="button">Další ›</button>' +
      '<img class="lb__img" alt="" />' +
      '<div class="lb__caption"></div>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector('.lb__img');
    var lbCap = lb.querySelector('.lb__caption');
    var lbClose = lb.querySelector('.lb__close');
    var lbPrev = lb.querySelector('.lb__prev');
    var lbNext = lb.querySelector('.lb__next');
    var idx = 0;
    var lastFocus = null;

    // foto zatím nemusí existovat (placeholdery) — místo rozbité ikony schovej img
    lbImg.addEventListener('error', function () {
      lbImg.style.display = 'none';
      lbCap.textContent = (items[idx].caption || '') + ' — foto doplníme';
    });
    lbImg.addEventListener('load', function () {
      lbImg.style.display = '';
    });

    var show = function (i) {
      if (i < 0) i = items.length - 1;
      if (i >= items.length) i = 0;
      idx = i;
      lbCap.textContent = items[i].caption;
      lbImg.src = items[i].src;
      lbImg.alt = items[i].caption || ('Kuchyně ' + (i + 1));
    };
    var openLb = function (i) {
      lastFocus = document.activeElement;
      show(i);
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    };
    var closeLb = function () {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    Array.prototype.forEach.call(lbCards, function (el, i) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openLb(i);
      });
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(i); }
      });
    });
    // Listovani jen v ramci stejne skupiny (galerie vs. dekory se neprolínají)
    var step = function (dir) {
      var g = items[idx].group;
      var inGroup = [];
      for (var k = 0; k < items.length; k++) { if (items[k].group === g) inGroup.push(k); }
      var pos = inGroup.indexOf(idx);
      pos = (pos + dir + inGroup.length) % inGroup.length;
      show(inGroup[pos]);
    };

    lbClose.addEventListener('click', closeLb);
    lbPrev.addEventListener('click', function () { step(-1); });
    lbNext.addEventListener('click', function () { step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
      // focus trap — Tab cykluje mezi tlačítky dialogu
      if (e.key === 'Tab') {
        var focusables = [lbClose, lbPrev, lbNext];
        var cur = focusables.indexOf(document.activeElement);
        e.preventDefault();
        var next = e.shiftKey ? cur - 1 : cur + 1;
        if (next < 0) next = focusables.length - 1;
        if (next >= focusables.length) next = 0;
        focusables[next].focus();
      }
    });
  }

  /* ---------- 5) Scroll reveals ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length > 0) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('in-view'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('in-view');
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
    }
  }

  /* ---------- 6) Proof bar — znaky se vynořují ---------- */
  if (!reducedMotion) {
    Array.prototype.forEach.call(document.querySelectorAll('.proof__n'), function (el) {
      var text = el.textContent;
      el.textContent = '';
      // čtečky: plný text v sr-only spanu, animované znaky aria-hidden
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      el.appendChild(sr);
      Array.prototype.forEach.call(text, function (ch, i) {
        var s = document.createElement('span');
        s.className = 'ch';
        s.style.setProperty('--ci', i);
        s.setAttribute('aria-hidden', 'true');
        s.textContent = ch === ' ' ? ' ' : ch;
        el.appendChild(s);
      });
    });
  }

  /* ---------- 7) Lamely — tap na mobilu, hover čistí výchozí stav ---------- */
  var slatsWrap = document.querySelector('.slats');
  if (slatsWrap) {
    var slats = slatsWrap.querySelectorAll('.slat');
    Array.prototype.forEach.call(slats, function (slat) {
      slat.addEventListener('click', function (e) {
        if (!window.matchMedia('(max-width: 760px)').matches) return;
        if (!slat.classList.contains('is-open')) {
          e.preventDefault();
          Array.prototype.forEach.call(slats, function (s) { s.classList.remove('is-open'); });
          slat.classList.add('is-open');
        }
      });
    });
    // na desktopu zruš výchozí .is-open, jakmile uživatel najede / zafokusuje lamely
    var clearDefault = function () {
      if (window.matchMedia('(max-width: 760px)').matches) return;
      Array.prototype.forEach.call(slats, function (s) { s.classList.remove('is-open'); });
      slatsWrap.removeEventListener('pointerenter', clearDefault);
      slatsWrap.removeEventListener('focusin', clearDefault);
    };
    slatsWrap.addEventListener('pointerenter', clearDefault);
    slatsWrap.addEventListener('focusin', clearDefault);
  }

  /* ---------- 8) Magnetická tlačítka (běží i při reduced-motion — brand) ----------
     Posun jde přes CSS proměnné --mx/--my, aby nepřebíjel .btn:active transform. */
  if (finePointer) {
    Array.prototype.forEach.call(document.querySelectorAll('.btn'), function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        btn.style.setProperty('--mx', (x * 5).toFixed(1) + 'px');
        btn.style.setProperty('--my', (y * 4).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---------- 9b) Hero paralaxa — fotka a anotace v různé hloubce ---------- */
  var heroMedia = document.querySelector('.hero3__media');
  if (heroMedia && finePointer) {
    var hImg = heroMedia.querySelector('img');
    var hAnnot = heroMedia.querySelector('.hero3__annot');
    var htx = 0, hty = 0, hcx = 0, hcy = 0;
    heroMedia.addEventListener('pointermove', function (e) {
      var r = heroMedia.getBoundingClientRect();
      htx = (e.clientX - r.left) / r.width - 0.5;
      hty = (e.clientY - r.top) / r.height - 0.5;
    }, { passive: true });
    heroMedia.addEventListener('pointerleave', function () { htx = 0; hty = 0; });
    (function heroLoop() {
      hcx += (htx - hcx) * 0.08;
      hcy += (hty - hcy) * 0.08;
      if (hImg) {
        hImg.style.setProperty('--px', (hcx * -14).toFixed(1) + 'px');
        hImg.style.setProperty('--py', (hcy * -10).toFixed(1) + 'px');
      }
      if (hAnnot) {
        hAnnot.style.setProperty('--ax', (hcx * -24).toFixed(1) + 'px');
        hAnnot.style.setProperty('--ay', (hcy * -16).toFixed(1) + 'px');
      }
      window.requestAnimationFrame(heroLoop);
    })();
  }

  /* ---------- 9) Custom kurzor (běží i při reduced-motion — brand) ---------- */
  if (finePointer) {
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    document.body.classList.add('has-cursor');

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var rx = tx, ry = ty;
    // do prvního pohybu drž oba prvky skryté na středu (jinak by tečka visela v rohu)
    dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    ring.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    dot.style.opacity = '0';
    ring.style.opacity = '0';
    var seen = false;
    var hidden = false;

    var setVisible = function (on) {
      var v = on && seen && !hidden ? '1' : '0';
      dot.style.opacity = v;
      ring.style.opacity = v;
    };

    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
      if (!seen) { seen = true; rx = tx; ry = ty; setVisible(true); }
    }, { passive: true });

    (function loop() {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
      window.requestAnimationFrame(loop);
    })();

    document.addEventListener('pointerover', function (e) {
      if (!e.target.closest) return;
      // nad textovými poli a mapou (iframe) custom kurzor schovej — nech nativní
      hidden = !!e.target.closest('input, textarea, select, iframe, .atelier-block__map');
      setVisible(true);
      var t = e.target.closest('a, button, .slat, [data-lb]');
      ring.classList.toggle('is-active', !!t);
    });
    document.documentElement.addEventListener('pointerleave', function () {
      dot.style.opacity = '0'; ring.style.opacity = '0';
    });
    document.documentElement.addEventListener('pointerenter', function () {
      setVisible(true);
    });
  }
})();

/* ---------- 9) Cookie consent + řízené marketingové cookies (Facebook Pixel) ----------
   Nezbytné cookies běží vždy. Marketingové/analytické (FB pixel) se spustí VÝHRADNĚ
   po kliknutí na „Přijmout vše". Volba se pamatuje v localStorage. */
(function () {
  'use strict';
  var KEY = 'dhouse_consent'; // 'granted' | 'denied'

  var FB_PIXEL_ID = '818976925290103';   // Meta (Facebook) Pixel — dhouse
  var HUBSPOT_PORTAL_ID = '2996399';     // HubSpot tracking (návštěvy -> CRM)

  function loadFacebookPixel() {
    if (!FB_PIXEL_ID || window.fbq) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', FB_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  function loadHubSpot() {
    if (!HUBSPOT_PORTAL_ID || document.getElementById('hs-script-loader')) return;
    var s = document.createElement('script');
    s.type = 'text/javascript'; s.id = 'hs-script-loader';
    s.async = true; s.defer = true;
    s.src = '//js.hs-scripts.com/' + HUBSPOT_PORTAL_ID + '.js';
    document.head.appendChild(s);
  }
  function grantMarketing() { loadFacebookPixel(); loadHubSpot(); }

  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored === 'granted') { grantMarketing(); return; }
  if (stored === 'denied') { return; }
  if (!document.body) return;

  var bar = document.createElement('div');
  bar.className = 'cookie';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-live', 'polite');
  bar.setAttribute('aria-label', 'Souhlas s cookies');
  bar.innerHTML =
    '<div class="cookie__inner wrap">' +
      '<div class="cookie__text">' +
        '<strong>Cookies a soukromí</strong>' +
        '<p>Nezbytné cookies používáme pro chod webu. S vaším souhlasem i marketingové a analytické cookies (např. Facebook pixel) pro měření a reklamu. Více v <a href="/ochrana-osobnich-udaju">Ochraně osobních údajů</a>.</p>' +
      '</div>' +
      '<div class="cookie__actions">' +
        '<button type="button" class="btn btn--ghost cookie__btn" data-consent="denied">Odmítnout</button>' +
        '<button type="button" class="btn cookie__btn" data-consent="granted">Přijmout vše</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(bar);
  window.requestAnimationFrame(function () { bar.classList.add('is-in'); });

  function decide(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    bar.classList.remove('is-in');
    setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 450);
    if (v === 'granted') grantMarketing();
  }
  bar.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-consent]') : null;
    if (b) decide(b.getAttribute('data-consent'));
  });
})();
