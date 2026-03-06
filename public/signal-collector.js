(function SmartRecSignals() {
  const SESSION_KEY = "sr_session";
  const API_BASE = window.SR_API_BASE || ""; // Set by app

  // Session state
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
  session.pageViews = session.pageViews || [];
  session.backNavCount = session.backNavCount || 0;
  session.cartProducts = session.cartProducts || [];

  let quotaExceeded = false;

  // Check quota on load
  async function checkQuota() {
    try {
      const res = await fetch(`${API_BASE}/api/quota?shop=${window.Shopify.shop}`);
      const { usageCount, limit, plan } = await res.json();
      
      if (plan === "free" && usageCount >= limit) {
        quotaExceeded = true;
        showUpgradeBanner(usageCount, limit);
      } else if (plan === "free" && usageCount >= limit * 0.9) {
        showWarningBanner(usageCount, limit);
      }
      
      return { usageCount, limit };
    } catch (error) {
      console.error("Error checking quota:", error);
      return { usageCount: 0, limit: 500 };
    }
  }

  function showUpgradeBanner(used, limit) {
    const banner = document.createElement("div");
    banner.className = "sr-quota-banner";
    banner.innerHTML = `
      <div class="sr-banner-content">
        ⚠️ Bạn đã dùng ${used}/${limit} lượt tháng này.
        <a href="${API_BASE}/app/billing/subscribe" target="_blank">Nâng cấp Growth</a> để không giới hạn.
        <button class="sr-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    document.body.appendChild(banner);
  }

  function showWarningBanner(used, limit) {
    const banner = document.createElement("div");
    banner.className = "sr-quota-banner sr-warning";
    banner.innerHTML = `
      <div class="sr-banner-content">
        📊 Bạn đã dùng ${used}/${limit} lượt (${Math.round((used/limit)*100)}%).
        <button class="sr-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    document.body.appendChild(banner);
  }

  // Track interaction
  async function trackInteraction(widgetType, productId, eventType) {
    if (quotaExceeded) {
      // Still track but don't block
      console.log("Quota exceeded, tracking continues");
    }

    try {
      const res = await fetch(`${API_BASE}/api/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: window.Shopify.shop,
          widgetType,
          productId,
          eventType,
          srSource: true,
        }),
      });

      const data = await res.json();
      
      if (data.shouldShowBanner) {
        showWarningBanner(data.usageCount, data.limit);
      }

      // Track cart products for order attribution
      if (eventType === "add_to_cart" && productId) {
        session.cartProducts.push(productId);
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    } catch (error) {
      console.error("Error tracking interaction:", error);
    }
  }

  // Page type detection
  function detectPageType() {
    if (window.location.pathname.includes("/products/")) return "product";
    if (window.location.pathname.includes("/cart")) return "cart";
    if (window.location.pathname.includes("/collections/")) return "collection";
    return "home";
  }

  const pageType = detectPageType();

  // Track page view
  if (pageType === "product") {
    const productId = window.location.pathname.split("/products/")[1];
    session.pageViews.push({ productId, timestamp: Date.now() });
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  // Check quota and expose API
  checkQuota();

  // Expose global API
  window.SmartRec = {
    track: trackInteraction,
    checkQuota,
  };
})();
