/* dhouse.cz — interakce. Vanilla JS, žádné závislosti.
 * 1) Mobilní hamburger menu
 * 2) Sticky nav scroll-aware (.nav-scrolled)
 * 3) Galerie lightbox (klik na .gcard[data-lb])
 * 4) Aktivní položka v navigaci podle .pathname
 */
(function () {
  'use strict';

  /* ---------- 1) Mobile menu ---------- */
  var burger = document.getElementById('navBurger');
  var links  = document.getElementById('navLinks');
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

  /* ---------- 2) Sticky nav scroll handler ---------- */
  var lastScroll = 0;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (y > 80) document.body.classList.add('nav-scrolled');
    else document.body.classList.remove('nav-scrolled');
    lastScroll = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  /* ---------- 3) Active nav link by pathname ---------- */
  try {
    var path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    var navAnchors = document.querySelectorAll('.nav__links a[href]');
    navAnchors.forEach(function (a) {
      var href = a.getAttribute('href').replace(/\.html$/, '').replace(/\/$/, '') || '/';
      if (href === path) a.setAttribute('aria-current', 'page');
    });
  } catch (e) { /* noop */ }

  /* ---------- 4) Lightbox pro galerii ---------- */
  var lbCards = document.querySelectorAll('[data-lb]');
  if (lbCards.length === 0) return;

  // Sestav seznam položek
  var items = Array.prototype.map.call(lbCards, function (el) {
    return {
      src: el.getAttribute('data-lb-src') || el.getAttribute('data-lb'),
      caption: el.getAttribute('data-lb-caption') || ''
    };
  });

  // Vytvoř DOM lightboxu jednou
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

  function show(i) {
    if (i < 0) i = items.length - 1;
    if (i >= items.length) i = 0;
    idx = i;
    lbImg.src = items[i].src;
    lbImg.alt = items[i].caption || ('Kuchyně ' + (i + 1));
    lbCap.textContent = items[i].caption;
  }
  function open(i) {
    show(i);
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }
  function close() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  Array.prototype.forEach.call(lbCards, function (el, i) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      open(i);
    });
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
    });
  });
  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', function () { show(idx - 1); });
  lbNext.addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
})();
