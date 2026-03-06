#!/bin/bash

echo "=== Creating SmartRec Pricing System v2.0 Final Package ==="
echo ""

# Create package directory
PACKAGE_DIR="smartrec-pricing-system-v2.0"
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# Copy production files
echo "✅ Copying production files..."
mkdir -p $PACKAGE_DIR/app/routes
mkdir -p $PACKAGE_DIR/app/middleware
mkdir -p $PACKAGE_DIR/pricing-system/core
mkdir -p $PACKAGE_DIR/public
mkdir -p $PACKAGE_DIR/prisma/migrations

# Routes
cp app/routes/api.track.ts $PACKAGE_DIR/app/routes/
cp app/routes/api.quota.ts $PACKAGE_DIR/app/routes/
cp app/routes/api.config.ts $PACKAGE_DIR/app/routes/
cp app/routes/api.stats.ts $PACKAGE_DIR/app/routes/
cp app/routes/app.billing.subscribe.tsx $PACKAGE_DIR/app/routes/
cp app/routes/app.billing.addon.tsx $PACKAGE_DIR/app/routes/
cp app/routes/app.pricing-dashboard.tsx $PACKAGE_DIR/app/routes/
cp app/routes/app.settings.appearance.tsx $PACKAGE_DIR/app/routes/
cp app/routes/app.settings.appearance-pro.tsx $PACKAGE_DIR/app/routes/
cp app/routes/app.analytics-pro.tsx $PACKAGE_DIR/app/routes/
cp app/routes/webhooks.orders.create.ts $PACKAGE_DIR/app/routes/

# Middleware
cp app/middleware/rate-limit.server.ts $PACKAGE_DIR/app/middleware/

# Pricing module
cp pricing-system/core/billing-manager.ts $PACKAGE_DIR/pricing-system/core/

# Storefront
cp public/signal-collector.js $PACKAGE_DIR/public/
cp public/signal-collector.css $PACKAGE_DIR/public/

# Prisma schema (extract pricing models only)
cat > $PACKAGE_DIR/prisma/pricing-models.prisma << 'SCHEMA'
// Pricing System Models
// Add these to your existing schema.prisma file

model UsageLog {
  id         Int      @id @default(autoincrement())
  shopId     String
  widgetType String
  productId  String?
  eventType  String
  srSource   Boolean  @default(false)
  timestamp  DateTime @default(now())

  @@index([shopId, timestamp])
}

model Subscription {
  id             Int       @id @default(autoincrement())
  shopId         String    @unique
  plan           String    // 'free' | 'growth'
  status         String    // 'active' | 'trial' | 'cancelled'
  trialEndsAt    DateTime?
  billingCycleAnchor DateTime?
  shopifyChargeId String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model AddonSubscription {
  id              Int      @id @default(autoincrement())
  shopId          String
  addonType       String   // 'appearance_pro' | 'analytics_pro'
  status          String   // 'active' | 'cancelled'
  shopifyChargeId String?
  createdAt       DateTime @default(now())

  @@index([shopId, addonType])
}

model ShopConfig {
  shopId       String   @id
  primaryColor String?  @default("#4A90E2")
  widgetColors String?  // JSON string
  buttonStyle  String?  @default("solid")
  updatedAt    DateTime @updatedAt
}

model OrderAttribution {
  id                 Int      @id @default(autoincrement())
  shopId             String
  orderId            String
  orderNumber        String
  attributedRevenue  Float
  totalOrderValue    Float
  attributedProducts String   // Comma-separated product IDs
  orderDate          DateTime
  createdAt          DateTime @default(now())

  @@index([shopId, orderDate])
}
SCHEMA

# Migration SQL
cp -r prisma/migrations/20260305140849_add_pricing_system $PACKAGE_DIR/prisma/migrations/ 2>/dev/null || echo "Migration will be created on first run"

# Documentation
echo "✅ Copying documentation..."
cp PRICING_SYSTEM_README.md $PACKAGE_DIR/
cp DEPLOYMENT_CHECKLIST.md $PACKAGE_DIR/
cp PRICING_POLICY_V2.md $PACKAGE_DIR/
cp PRICING_V2_CHANGES.md $PACKAGE_DIR/
cp TEST_REPORT.md $PACKAGE_DIR/
cp FINAL_PACKAGE_README.md $PACKAGE_DIR/README.md

# Environment template
cat > $PACKAGE_DIR/.env.example << 'ENV'
# SmartRec Pricing System Configuration

# Required
SHOPIFY_APP_HANDLE=your-app-handle
APP_URL=https://your-app-url.com

# Environment
NODE_ENV=production

# Optional: Error tracking
# SENTRY_DSN=your-sentry-dsn

# Optional: Redis for rate limiting (production)
# REDIS_URL=redis://localhost:6379
ENV

# Installation script
cat > $PACKAGE_DIR/install.sh << 'INSTALL'
#!/bin/bash

echo "🚀 Installing SmartRec Pricing System v2.0..."
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run this script from your Shopify app root directory."
  exit 1
fi

echo "📋 Copying files..."

# Copy routes
cp -r app/routes/* ../app/routes/ 2>/dev/null || mkdir -p ../app/routes && cp -r app/routes/* ../app/routes/

# Copy middleware
cp -r app/middleware/* ../app/middleware/ 2>/dev/null || mkdir -p ../app/middleware && cp -r app/middleware/* ../app/middleware/

# Copy pricing module
cp -r pricing-system ../

# Copy storefront scripts
cp public/* ../public/

echo "✅ Files copied"

echo "🔧 Generating Prisma client..."
cd ..
npx prisma generate

echo "🗄️  Running database migration..."
npx prisma migrate dev --name add_pricing_system

echo "⚠️  Created .env.example - configure before deploying"

echo ""
echo "✅ Installation complete!"
echo ""
echo "📖 Next steps:"
echo "  1. Review .env.example and configure"
echo "  2. Read README.md for integration guide"
echo "  3. Test locally: npm run dev"
echo "  4. Deploy: Follow DEPLOYMENT_CHECKLIST.md"
INSTALL

chmod +x $PACKAGE_DIR/install.sh

# Create tarball
echo "📦 Creating package tarball..."
tar -czf smartrec-pricing-system-v2.0.tar.gz $PACKAGE_DIR

# Checksum
echo "🔐 Generating checksum..."
shasum -a 256 smartrec-pricing-system-v2.0.tar.gz > smartrec-pricing-system-v2.0.tar.gz.sha256

# Summary
echo ""
echo "✅ Package created successfully!"
echo ""
echo "📦 Package: smartrec-pricing-system-v2.0.tar.gz"
ls -lh smartrec-pricing-system-v2.0.tar.gz
echo ""
echo "🔐 Checksum:"
cat smartrec-pricing-system-v2.0.tar.gz.sha256
echo ""
echo "📁 Files included:"
find $PACKAGE_DIR -type f | wc -l | xargs echo "  Total files:"
echo ""
echo "🎉 Ready to deploy!"
