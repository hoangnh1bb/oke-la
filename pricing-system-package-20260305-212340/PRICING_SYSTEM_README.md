# Pricing System Implementation

## ✅ Completed Components

### 1. Database Schema (Prisma)
- ✅ UsageLog - Track interactions
- ✅ Subscription - Manage plans
- ✅ AddonSubscription - Track add-ons
- ✅ ShopConfig - Appearance settings
- ✅ OrderAttribution - Revenue tracking

**Migration:** `20260305140849_add_pricing_system` applied

### 2. API Routes
- ✅ `/api/track` - Log interactions
- ✅ `/api/quota` - Check usage limits
- ✅ `/api/config` - Get shop appearance config
- ✅ `/api/stats` - Growth tier analytics

### 3. Billing
- ✅ `/app/billing/subscribe` - Growth subscription flow
- ✅ `pricing-system/core/billing-manager.ts` - Shopify billing wrapper

### 4. Admin UI
- ✅ `/app/pricing-dashboard` - Usage & billing dashboard
- ✅ `/app/settings/appearance` - Appearance customization

### 5. Storefront Scripts
- ✅ `public/signal-collector.js` - Track interactions
- ✅ `public/signal-collector.css` - Quota banner styles

### 6. Webhooks
- ✅ `/webhooks/orders/create` - Order attribution

## 📦 Pricing Tiers

```
✅ FREE
   - 500 interactions/month (soft limit)
   - Banner at 450 interactions
   - Full feature access

💰 GROWTH ($11/mo)
   - Unlimited interactions
   - Analytics dashboard
   - Appearance customization
   - 7-day trial

🎨 GIAO DIỆN PRO (+$5/mo)
   - Per-widget colors
   - Button style options
   - Custom text per widget

📊 THỐNG KÊ PRO (+$7/mo)
   - Top products chart
   - Order attribution
   - Revenue tracking
```

## 🚀 Integration Steps

### Step 1: Verify Database

```bash
npx prisma studio
# Check that new tables exist
```

### Step 2: Configure App Handle

Update `.env`:
```
SHOPIFY_APP_HANDLE=your-app-handle
```

### Step 3: Test Billing Flow

1. Install app on dev store
2. Visit `/app/pricing-dashboard`
3. Click "Upgrade to Growth"
4. Complete Shopify billing flow

### Step 4: Test Storefront Tracking

Add to theme.liquid (before `</head>`):

```liquid
<script src="{{ 'signal-collector.js' | asset_url }}"></script>
<link rel="stylesheet" href="{{ 'signal-collector.css' | asset_url }}">
<script>
  window.SR_API_BASE = "https://your-app-url.com";
</script>
```

Test tracking:
```javascript
// In browser console
window.SmartRec.track("alternative_nudge", "12345", "widget_shown");
```

### Step 5: Setup Webhook

In Shopify Partners → App → Webhooks:
- Topic: `orders/create`
- URL: `https://your-app-url.com/webhooks/orders/create`
- Format: JSON

## 🧪 Testing Checklist

### Free Tier
- [ ] Track interaction via `/api/track`
- [ ] Verify count in `/api/quota`
- [ ] Banner shows at 450 interactions
- [ ] Widgets still work after 500

### Growth Subscription
- [ ] Subscribe flow redirects to Shopify
- [ ] After confirmation, status = "active" in DB
- [ ] Unlimited tracking works
- [ ] Dashboard shows stats

### Appearance
- [ ] Change primary color
- [ ] Update headline text
- [ ] Select button style
- [ ] Preview updates in real-time

### Order Attribution
- [ ] Add product via widget (tracked as `sr_source=true`)
- [ ] Complete order
- [ ] Check `OrderAttribution` table for order ID

## 📁 File Structure

```
app/
├── routes/
│   ├── api.track.ts                    # Track interactions
│   ├── api.quota.ts                    # Check usage
│   ├── api.config.ts                   # Get config
│   ├── api.stats.ts                    # Analytics
│   ├── app.billing.subscribe.tsx       # Billing flow
│   ├── app.pricing-dashboard.tsx       # Dashboard
│   ├── app.settings.appearance.tsx     # Settings
│   └── webhooks.orders.create.ts       # Webhook handler

pricing-system/
└── core/
    └── billing-manager.ts              # Billing utilities

public/
├── signal-collector.js                 # Storefront tracker
└── signal-collector.css                # Banner styles

prisma/
├── schema.prisma                       # Updated schema
└── migrations/
    └── 20260305140849_add_pricing_system/
        └── migration.sql               # Migration
```

## 🔧 Configuration

### Pricing Tiers (pricing-system/core/billing-manager.ts)

```typescript
export const PRICING_TIERS = {
  growth: {
    amount: 11.0,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 7,
  },
  appearance_pro: {
    amount: 5.0,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
  },
  analytics_pro: {
    amount: 7.0,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
  },
};
```

### Quota Limits

Free tier: `500 interactions/month`
Warning banner: `450 interactions` (90%)

## ⚙️ Environment Variables

Required:
```
SHOPIFY_APP_HANDLE=your-app-handle
DATABASE_URL="file:./dev.sqlite"
```

## 🐛 Troubleshooting

### "Billing failed" error
- Check `SHOPIFY_APP_HANDLE` in .env
- Verify billing is configured in shopify.app.toml
- Check server logs for detailed error

### Quota not updating
- Verify `/api/track` is being called
- Check UsageLog table in Prisma Studio
- Ensure `shopId` matches Shopify shop domain

### Webhook not firing
- Verify webhook URL is publicly accessible
- Check Shopify webhook delivery status
- Look for 403/401 errors (auth issue)

## 📊 Monitoring

Check usage:
```sql
SELECT widgetType, COUNT(*) as count
FROM UsageLog
WHERE shopId = 'shop-domain.myshopify.com'
  AND timestamp >= DATE('now', 'start of month')
GROUP BY widgetType;
```

Check subscriptions:
```sql
SELECT shopId, plan, status, trialEndsAt
FROM Subscription
WHERE status = 'active';
```

Check attributed orders:
```sql
SELECT orderId, orderTotal, createdAt
FROM OrderAttribution
WHERE shopId = 'shop-domain.myshopify.com'
ORDER BY createdAt DESC;
```

## 🚧 Deferred Features (v1.1)

These were intentionally deferred per spec:
- [ ] Live preview for appearance pro
- [ ] Advanced revenue attribution models
- [ ] Per-widget text customization UI
- [ ] Analytics Pro full dashboard
- [ ] Email notifications for quota warnings

## ✅ Production Readiness

Before deploying:
1. [ ] Update `isTest: false` in billing-manager.ts
2. [ ] Set production DATABASE_URL
3. [ ] Configure CORS for /api/* routes
4. [ ] Setup webhook verification (HMAC)
5. [ ] Add error tracking (Sentry, etc.)
6. [ ] Load test quota tracking endpoint

## 📞 Support

For issues or questions:
- Check Prisma Studio for data issues
- Review server logs for API errors
- Test billing flow in development mode first

---

**Built:** March 5, 2026
**Status:** ✅ Core system complete, ready for integration testing
**Next:** Add-on purchase flows, analytics pro dashboard
