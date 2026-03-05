-- CreateTable
CREATE TABLE "UsageLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "productId" TEXT,
    "eventType" TEXT NOT NULL,
    "srSource" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "trialEndsAt" DATETIME,
    "billingCycleAnchor" DATETIME,
    "shopifyChargeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AddonSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "addonType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "shopifyChargeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShopConfig" (
    "shopId" TEXT NOT NULL PRIMARY KEY,
    "primaryColor" TEXT NOT NULL DEFAULT '#4A90E2',
    "headlineText" TEXT NOT NULL DEFAULT 'Bạn có thể thích',
    "widgetColors" TEXT,
    "widgetTexts" TEXT,
    "buttonStyle" TEXT NOT NULL DEFAULT 'solid',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrderAttribution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productIds" TEXT NOT NULL,
    "orderTotal" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "UsageLog_shopId_timestamp_idx" ON "UsageLog"("shopId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shopId_key" ON "Subscription"("shopId");

-- CreateIndex
CREATE INDEX "AddonSubscription_shopId_addonType_idx" ON "AddonSubscription"("shopId", "addonType");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAttribution_orderId_key" ON "OrderAttribution"("orderId");

-- CreateIndex
CREATE INDEX "OrderAttribution_shopId_createdAt_idx" ON "OrderAttribution"("shopId", "createdAt");
