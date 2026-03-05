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
