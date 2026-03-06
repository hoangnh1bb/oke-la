/**
 * SmartRec Signal Collector — Full Implementation
 * Tracks 8 behavioral signals on storefront and calls Intent Engine.
 * Vanilla JS IIFE, no imports, < 10KB uncompressed.
 *
 * Config via window.SmartRecMeta (injected by Liquid embed block):
 *   appProxy, pageType, productId, enableTracking
 *
 * Integration: calls window.SmartRec._onAction(action) after intent evaluation.
 */
(function SmartRecSignals() {
  'use strict';

  var META = window.SmartRecMeta;
  if (!META || !META.enableTracking) return;
  if (/\/checkout/i.test(window.location.pathname)) return;
  if (!META.appProxy) return;

  var PROXY = META.appProxy;
  var SESSION_KEY = 'sr_session';
  var SESSION_TTL = 24 * 60 * 60 * 1000; // 24h

  // ── Session Management ─────────────────────────────────────────

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s.createdAt || (Date.now() - s.createdAt) > SESSION_TTL) return null;
      return s;
    } catch (e) {
      return null;
    }
  }

  function saveSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) { /* silent */ }
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  var session = loadSession() || {
    id: generateId(),
    createdAt: Date.now(),
    pageViews: [],
    backNavCount: 0,
    cartItems: [],
    returningVisitor: false
  };

  // Mark returning visitor if session existed before
  if (loadSession()) {
    session.returningVisitor = true;
  }

  // Track current product page
  if (META.pageType === 'product' && META.productId) {
    session.currentProduct = META.productId;
    if (session.pageViews.indexOf(META.productId) === -1) {
      session.pageViews.push(META.productId);
    }
    // Limit stored page views
    if (session.pageViews.length > 20) {
      session.pageViews = session.pageViews.slice(-20);
    }
  }

  // Track cart items from page meta
  if (META.cartItems && Array.isArray(META.cartItems)) {
    session.cartItems = META.cartItems;
  }

  saveSession(session);

  // ── Signal State ───────────────────────────────────────────────

  var signals = {
    timeOnProduct: 0,         // seconds
    scrollDepth: 0,           // 0–100%
    reviewHover: false,
    sizeChartOpen: false,
    imageGallerySwipes: 0,
    backNavigation: false,
    cartHesitation: 0,        // seconds on cart page
    comparePattern: session.pageViews.length >= 2,
    returningVisitor: !!session.returningVisitor,
    trafficSourceKeyword: /[?&](q|query|search|keyword)=/i.test(window.location.search)
  };

  // Check referrer for search engine traffic
  if (document.referrer && /google|bing|yahoo|duckduckgo/i.test(document.referrer)) {
    signals.trafficSourceKeyword = true;
  }

  var hasSignificantChange = false;
  var debounceTimer = null;
  var evalScheduled = false;

  // ── Signal: Time on Product ────────────────────────────────────

  if (META.pageType === 'product') {
    var timeInterval = setInterval(function() {
      signals.timeOnProduct += 10;
      // Mark significant change at key thresholds
      if (signals.timeOnProduct === 60 || signals.timeOnProduct === 120) {
        hasSignificantChange = true;
        scheduleEval();
      }
    }, 10000);

    // Cleanup on page unload
    window.addEventListener('pagehide', function() { clearInterval(timeInterval); });
  }

  // ── Signal: Cart Hesitation ────────────────────────────────────

  if (META.pageType === 'cart') {
    var cartInterval = setInterval(function() {
      signals.cartHesitation += 10;
      if (signals.cartHesitation === 60) {
        hasSignificantChange = true;
        scheduleEval();
      }
    }, 10000);

    window.addEventListener('pagehide', function() { clearInterval(cartInterval); });
  }

  // ── Signal: Scroll Depth ───────────────────────────────────────

  var scrollListener = function() {
    var scrolled = window.scrollY + window.innerHeight;
    var total = Math.max(document.documentElement.scrollHeight, 1);
    var depth = Math.round((scrolled / total) * 100);
    if (depth > signals.scrollDepth) {
      signals.scrollDepth = Math.min(depth, 100);
      if (signals.scrollDepth >= 70 && signals.scrollDepth - 10 < 70) {
        hasSignificantChange = true;
        scheduleEval();
      }
    }
  };

  window.addEventListener('scroll', scrollListener, { passive: true });

  // ── Signal: Review Hover ───────────────────────────────────────

  var reviewSelectors = [
    '.product-reviews', '[data-reviews]', '#shopify-product-reviews',
    '.spr-reviews', '.reviews', '.product__reviews', '.judge-widget',
    '.stamped-reviews', '[data-yotpo-main-widget]', '.jdgm-widget'
  ];

  var reviewHoverListener = function() {
    if (!signals.reviewHover) {
      signals.reviewHover = true;
      hasSignificantChange = true;
      scheduleEval();
    }
  };

  for (var rs = 0; rs < reviewSelectors.length; rs++) {
    var reviewEl = document.querySelector(reviewSelectors[rs]);
    if (reviewEl) {
      reviewEl.addEventListener('mouseenter', reviewHoverListener, { once: true });
      reviewEl.addEventListener('touchstart', reviewHoverListener, { once: true, passive: true });
      break;
    }
  }

  // ── Signal: Size Chart Open ────────────────────────────────────

  var sizeChartSelectors = [
    '[data-size-chart]', '.size-chart', '#size-chart',
    'button[aria-label*="size"]', 'a[href*="size-guide"]',
    '.size-guide', '.size-guide-trigger'
  ];

  var sizeChartListener = function() {
    if (!signals.sizeChartOpen) {
      signals.sizeChartOpen = true;
      hasSignificantChange = true;
      scheduleEval();
    }
  };

  for (var sc = 0; sc < sizeChartSelectors.length; sc++) {
    var sizeEl = document.querySelector(sizeChartSelectors[sc]);
    if (sizeEl) {
      sizeEl.addEventListener('click', sizeChartListener, { once: true });
      break;
    }
  }

  // ── Signal: Image Gallery Swipe ────────────────────────────────

  var galleryTouchStartX = 0;

  var gallerySelectors = [
    '.product__media-gallery', '.product-gallery',
    '.product__photos', '[data-product-gallery]',
    '.product-single__photos', '.product__media-list'
  ];

  for (var gi = 0; gi < gallerySelectors.length; gi++) {
    var galleryEl = document.querySelector(gallerySelectors[gi]);
    if (galleryEl) {
      galleryEl.addEventListener('touchstart', function(e) {
        galleryTouchStartX = e.touches[0].clientX;
      }, { passive: true });

      galleryEl.addEventListener('touchend', function(e) {
        var dx = Math.abs(e.changedTouches[0].clientX - galleryTouchStartX);
        if (dx > 40) {
          signals.imageGallerySwipes++;
          if (signals.imageGallerySwipes === 3) {
            hasSignificantChange = true;
            scheduleEval();
          }
        }
      }, { passive: true });
      break;
    }
  }

  // ── Signal: Back Navigation Pattern ───────────────────────────

  // Detect rapid forward/back navigation via performance.navigation or popstate
  window.addEventListener('popstate', function() {
    signals.backNavigation = true;
    session.backNavCount = (session.backNavCount || 0) + 1;
    saveSession(session);
    hasSignificantChange = true;
    scheduleEval();
  });

  // ── Intent Score Calculation (client-side) ─────────────────────

  function calculateScore() {
    var score = 0;

    if (signals.timeOnProduct > 120) score += 40;
    else if (signals.timeOnProduct > 60) score += 25;

    if (signals.scrollDepth > 70) score += 15;
    if (signals.reviewHover) score += 20;
    if (signals.sizeChartOpen) score += 25;
    if (signals.imageGallerySwipes >= 3) score += 10;

    // Back navigation reduces score (comparison behaviour but indecisive)
    if (signals.backNavigation) score -= 30;

    if (signals.comparePattern) score += 20;
    if (signals.returningVisitor) score += 10;
    if (signals.trafficSourceKeyword) score += 15;

    return Math.max(0, Math.min(100, score));
  }

  // ── Beacon: fire-and-forget signal logging ─────────────────────

  function sendBeacon(data) {
    try {
      var payload = JSON.stringify(data);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(PROXY + '/track', new Blob([payload], { type: 'application/json' }));
      }
    } catch (e) { /* silent */ }
  }

  // ── Intent Fetch with 3s timeout ──────────────────────────────

  function fetchIntent(score) {
    var controller = null;
    var timeoutId = null;

    try {
      if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        timeoutId = setTimeout(function() { controller.abort(); }, 3000);
      }

      var payload = {
        sessionId: session.id,
        shop: META.shop || '',
        score: score,
        pageType: META.pageType || '',
        signals: signals,
        viewedProducts: session.pageViews || [],
        currentProduct: META.productId
          ? { id: META.productId, type: META.productType || '', tags: META.productTags || [], title: META.productTitle || '', price: META.productPrice || '', image: META.productImage || '' }
          : null,
        cartProductIds: session.cartItems || [],
        backNavCount: session.backNavCount || 0
      };

      fetch(PROXY + '/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      })
        .then(function(res) {
          if (timeoutId) clearTimeout(timeoutId);
          return res.ok ? res.json() : null;
        })
        .then(function(action) {
          if (!action) return;
          // Invoke widget renderer via hook
          if (window.SmartRec && typeof window.SmartRec._onAction === 'function') {
            window.SmartRec._onAction(action);
          } else if (typeof window.SmartRecRender === 'function') {
            // Fallback for legacy renderer
            window.SmartRecRender(action);
          }
        })
        .catch(function() {
          if (timeoutId) clearTimeout(timeoutId);
        });
    } catch (e) { /* silent */ }
  }

  // ── Evaluation orchestrator ────────────────────────────────────

  function evaluate() {
    evalScheduled = false;
    hasSignificantChange = false;

    var score = calculateScore();

    // Log signal beacon
    sendBeacon({
      sessionId: session.id,
      shop: META.shop || '',
      pageType: META.pageType || '',
      productId: META.productId || '',
      score: score,
      signals: signals
    });

    // Skip fetch for extreme scores — browsing or already buying
    if (score < 30 || score >= 90) return;

    fetchIntent(score);
  }

  function scheduleEval() {
    if (evalScheduled) return;
    evalScheduled = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(evaluate, 2000);
  }

  // ── Expose SmartRec namespace ──────────────────────────────────

  window.SmartRec = window.SmartRec || {};
  window.SmartRec._onAction = window.SmartRec._onAction || null;
  window.SmartRec.getScore = calculateScore;
  window.SmartRec.getSignals = function() { return signals; };
  window.SmartRec.getSession = function() { return session; };

  // ── Initial evaluation after 5s ───────────────────────────────

  setTimeout(evaluate, 5000);

})();
