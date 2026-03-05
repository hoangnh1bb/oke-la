# Pricing System Deployment Checklist

## Pre-Deployment

### 1. Environment Configuration
- [ ] Copy `.env.pricing.example` to `.env`
- [ ] Set `SHOPIFY_APP_HANDLE` (from Partners dashboard)
- [ ] Set `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
- [ ] Set `APP_URL` (publicly accessible URL)
- [ ] Set `DATABASE_URL` (production database)
- [ ] Set `NODE_ENV=production`
- [ ] Set `BILLING_TEST_MODE=false`

### 2. Database Setup
- [ ] Run production migration: `npx prisma migrate deploy`
- [ ] Verify all 5 tables exist: `npx prisma studio`
- [ ] Backup database before deployment

### 3. Shopify App Configuration
- [ ] Add billing plan to `shopify.app.toml`:
  ```toml
  [[billing]]
    [billing.plans.growth]
      amount = 11.0
      currency_code = "USD"
      interval = "EVERY_30_DAYS"
  ```
- [ ] Configure webhook in Partners dashboard:
  - Topic: `orders/create`
  - URL: `https://your-app-url.com/webhooks/orders/create`
  - Format: JSON
- [ ] Add app scopes if needed: `read_products,read_orders,write_script_tags`

### 4. Storefront Assets
- [ ] Upload `public/signal-collector.js` to theme assets
- [ ] Upload `public/signal-collector.css` to theme assets
- [ ] Add to `theme.liquid` (before `</head>`):
  ```liquid
  {% if shop.metafields.smartrec.enabled %}
    <script src="{{ 'signal-collector.js' | asset_url }}"></script>
    <link rel="stylesheet" href="{{ 'signal-collector.css' | asset_url }}">
    <script>
      window.SR_API_BASE = "https://your-app-url.com";
    </script>
  {% endif %}
  ```

### 5. Security Hardening
- [ ] Implement webhook HMAC verification
- [ ] Add rate limiting to public APIs:
  - `/api/track` - 100 req/min per shop
  - `/api/quota` - 60 req/min per shop
  - `/api/config` - 60 req/min per shop
- [ ] Add CORS headers for storefront scripts
- [ ] Sanitize user inputs (headline text, colors)
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags

### 6. Error Tracking & Monitoring
- [ ] Set up Sentry (or similar): `SENTRY_DSN`
- [ ] Configure logging (Winston, Pino, etc.)
- [ ] Set up uptime monitoring (Pingdom, UptimeRobot)
- [ ] Dashboard for key metrics:
  - Active subscriptions
  - Usage per shop
  - Revenue attribution accuracy
  - API error rates

### 7. Performance Optimization
- [ ] Add Redis caching for:
  - Shop config (TTL: 5 min)
  - Subscription status (TTL: 1 min)
  - Monthly usage count (invalidate on write)
- [ ] Optimize database queries:
  - Add indexes on frequently queried columns
  - Use `EXPLAIN` to analyze query plans
- [ ] Enable CDN for storefront scripts
- [ ] Compress assets (Gzip, Brotli)

## Deployment Steps

### 1. Build & Test
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build production bundle
npm run build

# Run tests (if available)
npm test

# Verify TypeScript compiles
npx tsc --noEmit
```

### 2. Database Migration
```bash
# Production migration (NO rollback!)
npx prisma migrate deploy

# Verify
npx prisma studio
```

### 3. Deploy Application
```bash
# Deploy to hosting (example: Fly.io)
fly deploy

# Or Heroku
git push heroku main

# Or custom VPS
pm2 start npm --name "smartrec-app" -- start
```

### 4. Verify Deployment
- [ ] Visit: `https://your-app-url.com/app/pricing-dashboard`
- [ ] Test billing flow:
  1. Click "Upgrade to Growth"
  2. Complete Shopify billing
  3. Verify subscription in database
- [ ] Test API endpoints:
  ```bash
  curl "https://your-app-url.com/api/quota?shop=test.myshopify.com"
  ```
- [ ] Test webhook:
  - Create test order in dev store
  - Check `OrderAttribution` table for entry

### 5. Post-Deployment Monitoring
- [ ] Monitor error logs for 24 hours
- [ ] Check database performance
- [ ] Verify billing charges are created
- [ ] Confirm quota tracking works
- [ ] Test storefront scripts on live store

## Rollback Plan

If deployment fails:

1. **Database:** Restore from backup
   ```bash
   # SQLite
   cp dev.sqlite.backup dev.sqlite
   
   # PostgreSQL
   psql dbname < backup.sql
   ```

2. **Application:** Revert to previous deployment
   ```bash
   fly deploy --image-ref previous-version
   # Or
   heroku rollback
   ```

3. **Webhooks:** Delete webhook in Partners dashboard

4. **Storefront:** Remove script tags from theme

## Production Checklist Summary

### Critical (Must Complete)
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] Webhook configured
- [ ] Billing plans configured
- [ ] Storefront scripts deployed
- [ ] HMAC verification enabled

### Important (Should Complete)
- [ ] Error tracking enabled
- [ ] Rate limiting configured
- [ ] Monitoring dashboard
- [ ] Backup strategy
- [ ] CORS headers set

### Nice to Have (Can Defer)
- [ ] Redis caching
- [ ] CDN for assets
- [ ] A/B testing framework
- [ ] Advanced analytics

## Support & Troubleshooting

### Common Issues

**Billing fails with "invalid handle"**
- Check `SHOPIFY_APP_HANDLE` in `.env`
- Verify handle matches Partners dashboard

**Webhook not firing**
- Verify URL is publicly accessible
- Check HMAC signature verification
- Review Shopify webhook delivery logs

**Quota not updating**
- Check `/api/track` is being called
- Verify `shopId` matches exactly
- Inspect `UsageLog` table in Prisma Studio

**Database connection errors**
- Verify `DATABASE_URL` is correct
- Check database is running
- Ensure network access (firewall, VPC)

### Monitoring Queries

```sql
-- Active subscriptions
SELECT plan, COUNT(*) as count
FROM Subscription
WHERE status = 'active'
GROUP BY plan;

-- Today's usage
SELECT COUNT(*) as interactions
FROM UsageLog
WHERE timestamp >= DATE('now');

-- Revenue attributed today
SELECT SUM(orderTotal) as revenue
FROM OrderAttribution
WHERE createdAt >= DATE('now');

-- Top shops by usage
SELECT shopId, COUNT(*) as usage
FROM UsageLog
WHERE timestamp >= DATE('now', '-7 days')
GROUP BY shopId
ORDER BY usage DESC
LIMIT 10;
```

## Security Audit (Before Production)

- [ ] No API keys in code (use env vars only)
- [ ] HTTPS enforced
- [ ] HMAC verification on webhooks
- [ ] Rate limiting on public endpoints
- [ ] Input validation & sanitization
- [ ] SQL injection protection (Prisma ORM)
- [ ] XSS prevention (Polaris components)
- [ ] CSRF protection (Remix built-in)
- [ ] Secure session cookies
- [ ] No sensitive data in logs

## Performance Benchmarks (Target)

- API response time: < 200ms (p95)
- Database query time: < 50ms (p95)
- Storefront script load: < 100ms
- Dashboard load time: < 1s
- Webhook processing: < 500ms

## Success Metrics (Week 1)

- [ ] Zero critical errors
- [ ] 95%+ API uptime
- [ ] Billing flow completion rate > 80%
- [ ] Quota tracking accuracy > 95%
- [ ] Attribution accuracy > 80%

---

**Last Updated:** March 5, 2026  
**Owner:** Orchestrator  
**Status:** Ready for production deployment
