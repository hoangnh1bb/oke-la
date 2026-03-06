#!/bin/bash
# Pricing System Packaging Script
# Creates deployable package with all files

set -e

echo "📦 Packaging Pricing System..."

# Create package directory
PACKAGE_DIR="pricing-system-package-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$PACKAGE_DIR"

echo "✅ Created package directory: $PACKAGE_DIR"

# Copy core files
echo "📋 Copying core files..."
cp -r app/routes/api.track.ts "$PACKAGE_DIR/"
cp -r app/routes/api.quota.ts "$PACKAGE_DIR/"
cp -r app/routes/api.config.ts "$PACKAGE_DIR/"
cp -r app/routes/api.stats.ts "$PACKAGE_DIR/"
cp -r app/routes/app.billing.subscribe.tsx "$PACKAGE_DIR/"
cp -r app/routes/app.billing.addon.tsx "$PACKAGE_DIR/"
cp -r app/routes/app.pricing-dashboard.tsx "$PACKAGE_DIR/"
cp -r app/routes/app.settings.appearance.tsx "$PACKAGE_DIR/"
cp -r app/routes/app.settings.appearance-pro.tsx "$PACKAGE_DIR/"
cp -r app/routes/app.analytics-pro.tsx "$PACKAGE_DIR/"
cp -r app/routes/webhooks.orders.create.ts "$PACKAGE_DIR/"

# Copy pricing system modules
echo "📋 Copying modules..."
mkdir -p "$PACKAGE_DIR/pricing-system"
cp -r pricing-system/ "$PACKAGE_DIR/"

# Copy storefront files
echo "📋 Copying storefront scripts..."
mkdir -p "$PACKAGE_DIR/public"
cp public/signal-collector.js "$PACKAGE_DIR/public/"
cp public/signal-collector.css "$PACKAGE_DIR/public/"

# Copy Prisma files
echo "📋 Copying database schema..."
mkdir -p "$PACKAGE_DIR/prisma"
cp prisma/schema.prisma "$PACKAGE_DIR/prisma/"
cp -r prisma/migrations/ "$PACKAGE_DIR/prisma/" 2>/dev/null || true

# Copy documentation
echo "📋 Copying documentation..."
cp PRICING_SYSTEM_README.md "$PACKAGE_DIR/"
cp PRICING_SYSTEM_DELIVERY.md "$PACKAGE_DIR/"
cp DEPLOYMENT_CHECKLIST.md "$PACKAGE_DIR/"
cp .env.pricing.example "$PACKAGE_DIR/"

# Create installation script
cat > "$PACKAGE_DIR/install.sh" << 'INSTALL'
#!/bin/bash
# Pricing System Installation Script

set -e

echo "🚀 Installing Pricing System..."

# Check if in correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Run this script from your Shopify app root directory"
  exit 1
fi

# Copy files
echo "📋 Copying files..."
cp -r pricing-system-package-*/app/routes/* app/routes/ 2>/dev/null || true
cp -r pricing-system-package-*/pricing-system/* pricing-system/ 2>/dev/null || true
cp -r pricing-system-package-*/public/* public/ 2>/dev/null || true
cp -r pricing-system-package-*/prisma/* prisma/ 2>/dev/null || true

# Copy env example if not exists
if [ ! -f ".env.pricing" ]; then
  cp pricing-system-package-*/.env.pricing.example .env.pricing
  echo "⚠️  Created .env.pricing.example - configure before deploying"
fi

echo "✅ Files copied"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migration
echo "🗄️  Running database migration..."
npx prisma migrate dev --name add_pricing_system

echo ""
echo "✅ Installation complete!"
echo ""
echo "📖 Next steps:"
echo "  1. Review .env.pricing.example and configure"
echo "  2. Read PRICING_SYSTEM_README.md for integration guide"
echo "  3. Test locally: npm run dev"
echo "  4. Deploy: Follow DEPLOYMENT_CHECKLIST.md"
echo ""
INSTALL

chmod +x "$PACKAGE_DIR/install.sh"

# Create README for package
cat > "$PACKAGE_DIR/README.md" << 'README'
# SmartRec Pricing System Package

## Quick Start

### 1. Installation

```bash
# Extract package to your Shopify app directory
cd /path/to/your/shopify-app
./install.sh
```

### 2. Configuration

```bash
# Copy and configure environment variables
cp .env.pricing.example .env.pricing
# Edit .env.pricing with your settings
```

### 3. Verify

```bash
# Check database
npx prisma studio

# Start dev server
npm run dev

# Visit dashboard
open http://localhost:3000/app/pricing-dashboard
```

## Package Contents

- **11 Route Files** - API endpoints, billing flows, dashboards
- **Pricing System Modules** - Core billing logic
- **Storefront Scripts** - Tracking & quota banners
- **Database Schema** - 5 new Prisma models
- **Documentation** - README, deployment guide, checklist
- **Configuration** - Example env file

## Documentation

- `PRICING_SYSTEM_README.md` - Complete integration guide
- `PRICING_SYSTEM_DELIVERY.md` - Technical specifications
- `DEPLOYMENT_CHECKLIST.md` - Production deployment guide

## Support

For issues or questions, refer to:
- README troubleshooting section
- Deployment checklist common issues
- Delivery doc for technical details

## Version

- **Built:** March 5, 2026
- **Status:** Production-ready
- **Features:** Free tier, Growth plan, 2 add-ons
README

# Create tarball
echo "📦 Creating tarball..."
tar -czf "$PACKAGE_DIR.tar.gz" "$PACKAGE_DIR"

# Create file list
find "$PACKAGE_DIR" -type f > "$PACKAGE_DIR/file-list.txt"

# Create checksum
shasum -a 256 "$PACKAGE_DIR.tar.gz" > "$PACKAGE_DIR.tar.gz.sha256"

echo ""
echo "✅ Package created successfully!"
echo ""
echo "📦 Package: $PACKAGE_DIR.tar.gz"
echo "📋 Checksum: $PACKAGE_DIR.tar.gz.sha256"
echo "📁 Directory: $PACKAGE_DIR/"
echo ""
echo "📤 To deploy:"
echo "  1. Extract: tar -xzf $PACKAGE_DIR.tar.gz"
echo "  2. Install: cd your-app && ./$PACKAGE_DIR/install.sh"
echo "  3. Configure: Edit .env.pricing"
echo "  4. Deploy: Follow DEPLOYMENT_CHECKLIST.md"
echo ""
