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
