(function SmartRecPreview() {
  "use strict";

  const WIDGET_CONTAINER_CLASS = "sr-preview-widget";

  function getFallbackProducts() {
    return [
      { title: "Demo Product 1", price: "29.99", image: null },
      { title: "Demo Product 2", price: "39.99", image: null },
    ];
  }

  function removeExistingWidgets() {
    document
      .querySelectorAll("." + WIDGET_CONTAINER_CLASS)
      .forEach(function (el) {
        el.remove();
      });
  }

  function injectStyles() {
    if (window.__smartrecStylesInjected) return;
    window.__smartrecStylesInjected = true;
    const style = document.createElement("style");
    style.textContent =
      ".sr-widget{background:#fff;border:1px solid #e1e3e5;border-radius:8px;padding:16px;font-family:inherit;max-width:600px;position:relative}.sr-widget-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-weight:500}.sr-dismiss{background:none;border:none;cursor:pointer;font-size:18px;color:#666}.sr-product-list{display:flex;gap:12px}.sr-product-card{display:flex;gap:8px;border:1px solid #f0f0f0;border-radius:6px;padding:8px}.sr-img-placeholder{width:80px;height:80px;background:#f0f0f0;border-radius:4px}.sr-product-title{font-size:13px;font-weight:500}.sr-product-price{font-size:13px;color:#333}.sr-view-btn{margin-top:4px;padding:4px 12px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px}.sr-comparison-bar{display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:0;border-left:none;border-right:none}.sr-comparison-bar-wrapper{position:fixed;bottom:0;left:0;right:0;z-index:9999}.sr-compare-btn{padding:6px 14px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer}.sr-tag-nav-wrapper{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:9999;max-width:260px}.sr-tag-nav-title{font-weight:500;margin-bottom:10px}.sr-tag-list{display:flex;flex-wrap:wrap;gap:8px}.sr-tag{padding:6px 12px;border:1px solid #000;border-radius:20px;background:none;cursor:pointer;font-size:13px}.sr-trust-nudge{background:#f6f6f7;border:none;border-top:1px solid #e1e3e5;border-radius:0;padding:12px 16px}.sr-trust-item{display:flex;gap:8px;align-items:center;margin-bottom:6px;font-size:14px}.sr-stars{color:#f4b400}.sr-preview-badge{position:absolute;top:4px;right:36px;font-size:10px;background:#5c6ac4;color:#fff;padding:2px 6px;border-radius:4px}";
    document.head.appendChild(style);
  }

  function renderAlternativeNudge(products) {
    removeExistingWidgets();
    const prods = products && products.length ? products : getFallbackProducts();
    const container = document.createElement("div");
    container.className = WIDGET_CONTAINER_CLASS;
    container.innerHTML =
      '<div class="sr-widget sr-alternative-nudge"><div class="sr-widget-header"><span>Không chắc chắn? Khách hàng tương tự cũng xem:</span><button class="sr-dismiss">×</button></div><div class="sr-product-list">' +
      prods
        .slice(0, 2)
        .map(function (p) {
          return (
            '<div class="sr-product-card">' +
            (p.image
              ? '<img src="' + p.image + '" alt="" width="80" height="80">'
              : '<div class="sr-img-placeholder"></div>') +
            '<div class="sr-product-info"><div class="sr-product-title">' +
            (p.title || "Product") +
            "</div><div class="sr-product-price">$" +
            (p.price || "0") +
            '</div><button class="sr-view-btn">Xem</button></div></div>'
          );
        })
        .join("") +
      '</div><div class="sr-preview-badge">✨ Preview</div></div>';
    container.querySelector(".sr-dismiss").addEventListener("click", function () {
      container.remove();
    });
    injectStyles();
    const addToCart = document.querySelector(
      '[name="add"], .product-form__submit, .btn--add-to-cart'
    );
    if (addToCart && addToCart.parentElement) {
      addToCart.parentElement.insertBefore(container, addToCart);
    } else {
      document.body.appendChild(container);
    }
  }

  function renderComparisonBar(products) {
    removeExistingWidgets();
    const prods = products && products.length ? products : getFallbackProducts();
    const p = prods[0];
    if (!p) return;
    const bar = document.createElement("div");
    bar.className = WIDGET_CONTAINER_CLASS + " sr-comparison-bar-wrapper";
    bar.innerHTML =
      '<div class="sr-widget sr-comparison-bar"><span>Bạn cũng đang xem:</span>' +
      (p.image ? '<img src="' + p.image + '" alt="" width="40" height="40">' : "") +
      "<span>" +
      (p.title || "Product") +
      "</span><span class=" +
      '"sr-price-diff"' +
      ">$" +
      (p.price || "0") +
      '</span><button class="sr-compare-btn">So sánh</button><button class="sr-dismiss">×</button><div class="sr-preview-badge">✨ Preview</div></div>';
    bar.querySelector(".sr-dismiss").addEventListener("click", function () {
      bar.remove();
    });
    injectStyles();
    document.body.appendChild(bar);
  }

  function renderTagNavigator() {
    removeExistingWidgets();
    const panel = document.createElement("div");
    panel.className = WIDGET_CONTAINER_CLASS + " sr-tag-nav-wrapper";
    panel.innerHTML =
      '<div class="sr-widget sr-tag-navigator"><button class="sr-dismiss">×</button><div class="sr-tag-nav-title">Vẫn đang tìm? Thử lọc theo:</div><div class="sr-tag-list"><button class="sr-tag">áo thun</button><button class="sr-tag">size M</button><button class="sr-tag">màu đen</button></div><div class="sr-preview-badge">✨ Preview</div></div>';
    panel.querySelector(".sr-dismiss").addEventListener("click", function () {
      panel.remove();
    });
    injectStyles();
    document.body.appendChild(panel);
  }

  function renderTrustNudge(products) {
    removeExistingWidgets();
    const prods = products && products.length ? products : getFallbackProducts();
    const p = prods[0];
    const nudge = document.createElement("div");
    nudge.className = WIDGET_CONTAINER_CLASS;
    nudge.innerHTML =
      '<div class="sr-widget sr-trust-nudge"><div class="sr-trust-item"><span class="sr-stars">★★★★★</span><span>' +
      (p ? p.title : "Sản phẩm") +
      " — 4.8★ từ 234 đánh giá</span></div><div class="sr-trust-item"><span>↩</span><span>Đổi trả miễn phí trong 30 ngày</span></div><div class="sr-preview-badge">✨ Preview</div></div>";
    injectStyles();
    const cartItems = document.querySelector(
      ".cart-items, .cart__items, form[action='/cart']"
    );
    if (cartItems && cartItems.parentNode) {
      cartItems.parentNode.insertBefore(nudge, cartItems.nextSibling);
    } else {
      document.body.appendChild(nudge);
    }
  }

  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "smartrec_preview_signal") return;
    const widget = event.data.widget;
    const products = event.data.products || getFallbackProducts();
    switch (widget) {
      case "alternative_nudge":
        renderAlternativeNudge(products);
        break;
      case "comparison_bar":
        renderComparisonBar(products);
        break;
      case "tag_navigator":
        renderTagNavigator();
        break;
      case "trust_nudge":
        renderTrustNudge(products);
        break;
    }
  });
})();
