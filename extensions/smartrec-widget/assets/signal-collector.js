/**
 * SmartRec Signal Collector
 * Tracks 7 behavioral signals on storefront, computes Intent Score (0-100),
 * and communicates with app server via Shopify App Proxy.
 * Bundle target: <15KB gzipped. No dependencies.
 */
(function SmartRecSignals() {
  "use strict";

  // ── Constants ────────────────────────────────────────
  var SESSION_KEY = "sr_session";
  var SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
  var MAX_VIEWED = 50;
  var THROTTLE_MS = 5000; // Min 5s between server calls
  var EVAL_DELAY = 5000; // 5s after page load before first eval
  var SCROLL_THROTTLE = 500; // Throttle scroll events
  var TIME_INTERVAL = 10000; // Track time every 10s
  var REVIEW_HOVER_THRESHOLD = 5000; // 5s hover to confirm review interest
  var CART_HESITATION_THRESHOLD = 60; // 60s idle on cart page

  // Selectors for cross-theme compatibility
  var REVIEW_SELECTORS =
    ".review, .reviews, [data-reviews], #reviews, #shopify-product-reviews, .spr-container, .jdgm-widget, .stamped-main-widget";
  var SIZE_CHART_SELECTORS =
    ".size-chart, .size-guide, [data-size-chart], [data-size-guide], a[href*='size'], button[class*='size-chart'], button[class*='size-guide']";
  var GALLERY_SELECTORS =
    ".product-gallery, .product__media, .product-single__media, .product__photos, [data-product-media-type], .product-image-container";

  // ── Root element & config ────────────────────────────
  var root = document.getElementById("smartrec-root");
  if (!root) return;

  // Don't run on checkout pages
  if (window.location.pathname.indexOf("/checkout") === 0) return;

  var config = {
    shop: root.dataset.shop || "",
    productId: root.dataset.productId || "",
    productType: root.dataset.productType || "",
    productTags: (root.dataset.productTags || "").split(",").filter(Boolean),
    productPrice: root.dataset.productPrice || "",
    productTitle: root.dataset.productTitle || "",
    productImage: root.dataset.productImage || "",
    proxyBase: root.dataset.proxyBase || "/apps/smartrec",
    pageType: root.dataset.pageType || "",
  };

  // ── Session management ───────────────────────────────

  function generateId() {
    return "sr_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  function createEmptySession() {
    return {
      id: generateId(),
      createdAt: Date.now(),
      visitCount: 1,
      viewedProducts: [],
      dismissed: [],
      signals: createEmptySignals(),
    };
  }

  function createEmptySignals() {
    return {
      timeOnProduct: 0,
      scrollDepth: 0,
      reviewHover: false,
      sizeChartOpen: false,
      imageGallerySwipes: 0,
      backNavigation: false,
      cartHesitation: 0,
      comparePattern: false,
      returningVisitor: false,
      trafficSourceKeyword: false,
    };
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return createEmptySession();

      var stored = JSON.parse(raw);
      // Check TTL — expire after 24h
      if (Date.now() - stored.createdAt > SESSION_TTL) {
        var fresh = createEmptySession();
        // Preserve visit count for returning visitor detection
        fresh.visitCount = (stored.visitCount || 0) + 1;
        return fresh;
      }
      // Reset per-page signals for new page view
      stored.signals = createEmptySignals();
      // Restore session-level flags
      stored.signals.returningVisitor = stored.visitCount > 1;
      stored.signals.trafficSourceKeyword = detectTrafficKeyword();
      return stored;
    } catch (e) {
      return createEmptySession();
    }
  }

  function saveSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      // localStorage full or unavailable — silently fail
    }
  }

  function addViewedProduct(productId, productType) {
    if (!productId) return;
    // Add product with metadata for compare pattern detection
    var entry = {
      id: productId,
      type: productType,
      tags: config.productTags,
      title: config.productTitle,
      price: config.productPrice,
      image: config.productImage,
      timestamp: Date.now(),
    };
    // Avoid duplicate consecutive views of same product
    var last = session.viewedProducts[session.viewedProducts.length - 1];
    if (last && last.id === productId) return;

    session.viewedProducts.push(entry);
    // Cap at MAX_VIEWED — remove oldest
    if (session.viewedProducts.length > MAX_VIEWED) {
      session.viewedProducts = session.viewedProducts.slice(-MAX_VIEWED);
    }
  }

  // ── Utility functions ────────────────────────────────

  function detectTrafficKeyword() {
    var params = new URLSearchParams(window.location.search);
    return !!(params.get("q") || params.get("utm_term") || params.get("query"));
  }

  function querySelectorAll(selectors) {
    try {
      return document.querySelectorAll(selectors);
    } catch (e) {
      return [];
    }
  }

  function throttle(fn, delay) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= delay) {
        last = now;
        fn.apply(this, arguments);
      }
    };
  }

  // ── Signal tracking: time on product page ────────────

  function trackTimeOnPage() {
    var timer = setInterval(function () {
      session.signals.timeOnProduct += 10; // Increment by 10s
      saveSession();
      // Re-evaluate when crossing thresholds (60s, 120s)
      if (session.signals.timeOnProduct === 60 || session.signals.timeOnProduct === 120) {
        evaluateAndAct();
      }
    }, TIME_INTERVAL);

    // Clean up on page unload
    window.addEventListener("pagehide", function () {
      clearInterval(timer);
    });
  }

  // ── Signal tracking: scroll depth ────────────────────

  function trackScrollDepth() {
    var onScroll = throttle(function () {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) return;
      var depth = Math.round((scrollTop / docHeight) * 100);
      if (depth > session.signals.scrollDepth) {
        session.signals.scrollDepth = depth;
        saveSession();
      }
    }, SCROLL_THROTTLE);

    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ── Signal tracking: review section hover ────────────

  function trackReviewHover() {
    var elements = querySelectorAll(REVIEW_SELECTORS);
    if (!elements.length) return;

    var hoverTimer = null;
    var confirmed = false;

    elements.forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        if (confirmed) return;
        hoverTimer = setTimeout(function () {
          confirmed = true;
          session.signals.reviewHover = true;
          saveSession();
          evaluateAndAct(); // Re-evaluate on significant signal
        }, REVIEW_HOVER_THRESHOLD);
      });

      el.addEventListener("mouseleave", function () {
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
      });
    });
  }

  // ── Signal tracking: size chart open ─────────────────

  function trackSizeChartOpen() {
    var elements = querySelectorAll(SIZE_CHART_SELECTORS);
    if (!elements.length) return;

    var captured = false;
    elements.forEach(function (el) {
      el.addEventListener("click", function () {
        if (captured) return;
        captured = true;
        session.signals.sizeChartOpen = true;
        saveSession();
        evaluateAndAct(); // Re-evaluate on significant signal
      });
    });
  }

  // ── Signal tracking: image gallery interaction ───────

  function trackImageGallery() {
    var elements = querySelectorAll(GALLERY_SELECTORS);
    if (!elements.length) return;

    elements.forEach(function (el) {
      // Track clicks and touch swipes on gallery
      el.addEventListener("click", onGalleryInteract);
      el.addEventListener("touchstart", onGalleryInteract, { passive: true });
    });

    function onGalleryInteract() {
      session.signals.imageGallerySwipes++;
      saveSession();
    }
  }

  // ── Signal tracking: back navigation ─────────────────

  function trackBackNavigation() {
    // Detect back button via popstate
    window.addEventListener("popstate", function () {
      session.signals.backNavigation = true;
      // Increment session-level back nav counter for UC-03 (lost shopper)
      session.backNavCount = (session.backNavCount || 0) + 1;
      saveSession();
    });

    // Also detect via pagehide + navigation type
    window.addEventListener("pagehide", function () {
      try {
        if (
          performance.getEntriesByType &&
          performance.getEntriesByType("navigation").length > 0
        ) {
          var navEntry = performance.getEntriesByType("navigation")[0];
          if (navEntry.type === "back_forward") {
            session.signals.backNavigation = true;
            session.backNavCount = (session.backNavCount || 0) + 1;
            saveSession();
          }
        }
      } catch (e) {
        // Silently fail — not all browsers support this
      }
    });
  }

  // ── Signal tracking: cart hesitation ──────────────────

  function trackCartHesitation() {
    var idleSeconds = 0;
    var idleTimer = null;
    var checkoutClicked = false;

    // Detect checkout button clicks
    var checkoutBtns = querySelectorAll(
      "[name='checkout'], .cart__checkout, .cart-checkout-button, [data-cart-checkout], a[href*='/checkout']"
    );
    checkoutBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        checkoutClicked = true;
        if (idleTimer) clearInterval(idleTimer);
      });
    });

    // Increment idle timer every second
    idleTimer = setInterval(function () {
      if (checkoutClicked) return;
      idleSeconds++;
      session.signals.cartHesitation = idleSeconds;

      // Trigger evaluation at 60s threshold
      if (idleSeconds === CART_HESITATION_THRESHOLD) {
        saveSession();
        evaluateAndAct();
      }
    }, 1000);

    // Reset idle on any user interaction
    var resetIdle = function () {
      idleSeconds = 0;
    };
    document.addEventListener("click", resetIdle);
    document.addEventListener("keydown", resetIdle);
    document.addEventListener("scroll", resetIdle, { passive: true });

    window.addEventListener("pagehide", function () {
      if (idleTimer) clearInterval(idleTimer);
    });
  }

  // ── Compare pattern detection ────────────────────────

  function detectComparePattern() {
    if (!config.productType) return;
    // Check if >=2 products of same type viewed in this session, each >30s
    var sameType = session.viewedProducts.filter(function (p) {
      return p.type === config.productType && p.id !== config.productId;
    });
    if (sameType.length >= 1) {
      // Current product + at least 1 previous of same type
      session.signals.comparePattern = true;
      saveSession();
    }
  }

  // ── Intent Score calculation ──────────────────────────

  function calculateIntentScore(signals) {
    var score = 0;

    // Real-time signals (per product page)
    if (signals.timeOnProduct > 60) score += 25;
    if (signals.timeOnProduct > 120) score += 15; // Cumulative: 40 total
    if (signals.scrollDepth > 70) score += 15;
    if (signals.reviewHover) score += 20;
    if (signals.sizeChartOpen) score += 25;
    if (signals.imageGallerySwipes > 3) score += 10;

    // Navigation signals
    if (signals.backNavigation) score -= 30;
    if (signals.comparePattern) score += 20;

    // Contextual boosts
    if (signals.returningVisitor) score += 10;
    if (signals.trafficSourceKeyword) score += 15;

    // Clamp to 0-100
    return Math.min(Math.max(score, 0), 100);
  }

  // ── Dismiss tracking ─────────────────────────────────

  function isDismissed(widgetType) {
    return session.dismissed.indexOf(widgetType) !== -1;
  }

  function dismiss(widgetType) {
    if (!isDismissed(widgetType)) {
      session.dismissed.push(widgetType);
      saveSession();
    }
    // Remove widget DOM if present
    var widget = document.getElementById("smartrec-widget-" + widgetType);
    if (widget) widget.remove();
  }

  // ── Cart product IDs extraction ─────────────────────

  function getCartProductIds() {
    try {
      // Shopify exposes cart items via global Shopify object or meta tags
      if (window.Shopify && window.Shopify.cart && window.Shopify.cart.items) {
        return window.Shopify.cart.items.map(function (item) {
          return "gid://shopify/Product/" + item.product_id;
        });
      }
      // Fallback: parse cart form hidden inputs
      var inputs = document.querySelectorAll("[data-product-id]");
      var ids = [];
      inputs.forEach(function (el) {
        var id = el.dataset.productId;
        if (id) ids.push("gid://shopify/Product/" + id);
      });
      return ids;
    } catch (e) {
      return [];
    }
  }

  // ── Server communication via App Proxy ───────────────

  var lastCallTime = 0;

  function evaluateAndAct() {
    var now = Date.now();
    if (now - lastCallTime < THROTTLE_MS) return;
    lastCallTime = now;

    var score = calculateIntentScore(session.signals);

    // Score <30 = browsing, do nothing. Score 90+ = ready to buy, don't distract.
    if (score < 30 || score >= 90) return;

    var payload = {
      sessionId: session.id,
      shop: config.shop,
      score: score,
      pageType: config.pageType,
      signals: session.signals,
      viewedProducts: session.viewedProducts.slice(-10), // Last 10 for server
      currentProduct: config.productId
        ? {
            id: config.productId,
            type: config.productType,
            tags: config.productTags,
            title: config.productTitle,
            price: config.productPrice,
            image: config.productImage,
          }
        : null,
      cartProductIds: getCartProductIds(),
      backNavCount: session.backNavCount || 0,
    };

    fetch(config.proxyBase + "/api/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("SmartRec API error: " + res.status);
        return res.json();
      })
      .then(function (action) {
        if (action.type && action.type !== "none" && !isDismissed(action.type)) {
          // Pass action to widget renderer (loaded separately)
          if (typeof window.SmartRecRender === "function") {
            window.SmartRecRender(action);
          }
        }
      })
      .catch(function (err) {
        // Silently fail — don't break storefront experience
        if (console && console.debug) {
          console.debug("[SmartRec] Intent evaluation failed:", err.message);
        }
      });
  }

  // ── Initialize ───────────────────────────────────────

  var session = loadSession();

  // Detect returning visitor
  session.signals.returningVisitor = session.visitCount > 1;
  session.signals.trafficSourceKeyword = detectTrafficKeyword();

  if (config.pageType === "product") {
    addViewedProduct(config.productId, config.productType);
    trackTimeOnPage();
    trackScrollDepth();
    trackReviewHover();
    trackSizeChartOpen();
    trackImageGallery();
    trackBackNavigation();
    detectComparePattern();
  }

  if (config.pageType === "cart") {
    trackCartHesitation();
  }

  saveSession();

  // First evaluation after 5s delay (let shopper settle)
  setTimeout(evaluateAndAct, EVAL_DELAY);

  // Expose for widget-renderer dismiss callbacks
  window.SmartRecDismiss = dismiss;
  // Expose for manual re-evaluation (e.g., from widget interactions)
  window.SmartRecEvaluate = evaluateAndAct;
})();
