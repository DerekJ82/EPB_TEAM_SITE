/* ===========================================================================
   MICROSITE UI - behaviour
   ---------------------------------------------------------------------------
   Five things happen here, and nothing else:
     1. Greeter -> section -> tab navigation
     2. Sticky bar: solid-on-scroll, wrap detection, measured height
     3. Reveal on scroll
     4. Pill toggles and expandable cards
     5. The dual-purpose scroll button

   No framework, no build. Plain ES5-ish so it runs anywhere.
   =========================================================================== */
(function () {
  'use strict';

  var SECTION = null;   // which section is open
  var TAB = null;       // which tab within it

  /* -------------------------------------------------------------- helpers */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* Reduced motion OR a hidden tab. Both must take the same immediate-paint
     path: requestAnimationFrame is SUSPENDED in a background tab, so an
     animation prepared there never runs and the content stays invisible. */
  function still() {
    return window.matchMedia('(prefers-reduced-motion:reduce)').matches ||
           document.hidden;
  }

  /* ------------------------------------------------------ 1. NAVIGATION */
  function openSection(key, tab) {
    SECTION = key;
    $('#greeter').hidden = true;
    $('#portal').hidden = false;

    // Build the tab bar for this section from its declared tabs.
    var row = $('#navRow');
    var tabs = $$('[data-section="' + key + '"]', $('#tabData'));
    row.innerHTML = tabs.map(function (t) {
      return '<button class="nav-tab" data-tab="' + t.getAttribute('data-tab') +
             '">' + t.getAttribute('data-label') + '</button>';
    }).join('');
    $$('.nav-tab', row).forEach(function (b) {
      b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    });

    markNavWrap();
    showTab(tab || tabs[0].getAttribute('data-tab'));
    window.scrollTo(0, 0);
  }

  function goHome() {
    $('#portal').hidden = true;
    $('#greeter').hidden = false;
    $('.nav').classList.remove('open');
    window.scrollTo(0, 0);
  }

  function showTab(tab) {
    TAB = tab;

    $$('.nav-tab').forEach(function (b) {
      var on = b.getAttribute('data-tab') === tab;
      b.classList.toggle('active', on);
      if (on) { var c = $('#navCurrent'); if (c) c.textContent = b.textContent; }
    });

    // Show the matching panel, hide the rest.
    $$('.tabview').forEach(function (v) { v.hidden = true; });
    var view = $('#view-' + tab);
    if (view) {
      view.hidden = false;
      initReveal(view);
    }

    $('.nav').classList.remove('open');   // close the mobile drawer
    window.scrollTo(0, 0);
    if (onScroll) onScroll();
  }

  /* --------------------------------------------------- 2. THE STICKY BAR */
  /* CSS can wrap the bar but cannot report that it did, and the wrapped state
     needs different borders and padding. Compare each tab's offsetTop against
     the first: any difference means the row broke.

     The bar's height then feeds content clearance and scroll-margin, so it is
     published as --navh. A hardcoded clearance breaks the moment the bar wraps. */
  function markNavWrap() {
    var row = $('#navRow');
    if (!row) return;
    var tabs = $$('.nav-tab', row);
    var wrapped = false;
    if (tabs.length > 1) {
      var top0 = tabs[0].offsetTop;
      for (var i = 1; i < tabs.length; i++) {
        if (Math.abs(tabs[i].offsetTop - top0) > 2) { wrapped = true; break; }
      }
    }
    row.classList.toggle('wrapped', wrapped);
    // Mirror onto the shell so the home button can match the tab padding
    // without needing :has(), which is not supported everywhere.
    var shell = $('.nav-shell');
    if (shell) shell.classList.toggle('wrapped', wrapped);

    var nav = $('.nav');
    var h = Math.round(nav.getBoundingClientRect().height) || 72;
    document.documentElement.style.setProperty('--navh', h + 'px');
    if (onScroll) onScroll();
  }

  /* ------------------------------------------------- 3. REVEAL ON SCROLL */
  function initReveal(root) {
    var els = $$('.reveal', root);
    if (still() || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });   // paint end state
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);          // fire once, then stop watching
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    els.forEach(function (e) {
      if (!e.classList.contains('in')) io.observe(e);
    });
  }

  /* ------------------------------------- 4. TOGGLES AND EXPANDABLE CARDS */
  function swapTo(wrapId, index, btn) {
    var wrap = document.getElementById(wrapId);
    if (!wrap) return;
    $$('.swap-b', wrap).forEach(function (b) { b.classList.toggle('on', b === btn); });
    $$('.swap-p', wrap).forEach(function (p) {
      p.classList.toggle('on', Number(p.getAttribute('data-i')) === index);
    });
    if (onScroll) onScroll();   // pane heights differ
  }

  /* Independent open state - several may be open at once, since the point is to
     compare them. Height is animated from a measured value, which is why the
     pane keeps its layout box (max-height:0) rather than display:none. */
  function expandTo(id) {
    var card = document.getElementById(id);
    if (!card) return;
    var btn = $('.gexp-hd', card), pane = $('.gexp-p', card);
    var open = card.classList.toggle('on');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (pane) pane.style.maxHeight = open ? (pane.scrollHeight + 'px') : '';
    if (onScroll) onScroll();
  }

  /* ------------------------------------------------ 5. THE SCROLL BUTTON */
  var onScroll = null;

  function initScrollBtn() {
    var btn = $('#scrollBtn');
    if (!btn) return;

    onScroll = function () {
      if ($('#portal').hidden) { btn.classList.remove('on'); return; }

      var y = window.scrollY || document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var next = nextTab();

      // A page that cannot scroll at all would never cross a scroll threshold,
      // so treat "nothing to scroll" as already being at the end.
      var noScroll = max <= 10;
      // A page barely taller than the viewport is the same problem in disguise:
      // it scrolls, so it misses the branch above, but there is less than the
      // reveal threshold of travel available and the button stays hidden the
      // whole way down. Under one viewport of travel counts as short.
      var shortPage = max < window.innerHeight;
      var atEnd = noScroll || shortPage || (max - y) < 120;

      btn.classList.toggle('on', (noScroll || shortPage) ? !!next : (y > 260));

      if (atEnd && next) {
        btn.classList.add('next');
        btn.innerHTML = 'Next section <i>&rarr;</i>';
        btn.setAttribute('aria-label', 'Go to the next section');
      } else {
        btn.classList.remove('next');
        btn.innerHTML = '<i>&uarr;</i> Back to top';
        btn.setAttribute('aria-label', 'Back to top');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    btn.addEventListener('click', function () {
      if (btn.classList.contains('next')) {
        var n = nextTab();
        if (n) showTab(n);
      } else {
        window.scrollTo(still() ? { top: 0 } : { top: 0, behavior: 'smooth' });
      }
    });
    onScroll();
  }

  /* The next tab is derived from the live tab list, not a fixed map, so adding
     a tab needs no change here. */
  function nextTab() {
    var list = $$('.nav-tab').map(function (b) { return b.getAttribute('data-tab'); });
    var i = list.indexOf(TAB);
    return (i > -1 && i < list.length - 1) ? list[i + 1] : null;
  }

  /* ------------------------------------------------------------- 6. BOOT */
  function boot() {
    // Section cards -> open that section
    $$('.ws-card').forEach(function (card) {
      card.addEventListener('click', function () {
        openSection(card.getAttribute('data-section'));
      });
    });

    // Greeter chevron -> scroll to the picker
    var chev = $('#grChev');
    if (chev) chev.addEventListener('click', function () {
      var t = $('#grStart');
      if (t) t.scrollIntoView(still() ? undefined : { behavior: 'smooth', block: 'start' });
    });

    // Home - two controls, one on the desktop bar and one in the mobile bar.
    // Both return to the section picker.
    ['#navHome', '#navHomeM'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('click', goHome);
    });

    // Mobile drawer
    var burger = $('#navBurger');
    if (burger) burger.addEventListener('click', function () {
      $('.nav').classList.toggle('open');
    });

    // Pill toggles, declared with data attributes in the markup
    $$('.swap-b').forEach(function (b) {
      b.addEventListener('click', function () {
        swapTo(b.getAttribute('data-wrap'), Number(b.getAttribute('data-i')), b);
      });
    });

    // Expandable cards
    $$('.gexp-hd').forEach(function (b) {
      b.addEventListener('click', function () {
        expandTo(b.closest('.gexp').id);
      });
    });

    // Bar turns solid once the page scrolls past the top
    window.addEventListener('scroll', function () {
      $('.nav').classList.toggle('solid', (window.scrollY || 0) > 12);
    }, { passive: true });

    window.addEventListener('resize', markNavWrap);

    initScrollBtn();
    initReveal(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
