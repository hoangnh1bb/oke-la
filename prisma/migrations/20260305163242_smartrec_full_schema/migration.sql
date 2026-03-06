-- CreateTable
CREATE TABLE "SmartRecSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "alternativeNudge" BOOLEAN NOT NULL DEFAULT true,
    "comparisonBar" BOOLEAN NOT NULL DEFAULT true,
    "tagNavigator" BOOLEAN NOT NULL DEFAULT true,
    "trustNudge" BOOLEAN NOT NULL DEFAULT true,
    "thresholdBrowsing" INTEGER NOT NULL DEFAULT 30,
    "thresholdConsidering" INTEGER NOT NULL DEFAULT 55,
    "thresholdHighIntent" INTEGER NOT NULL DEFAULT 75,
    "thresholdStrongIntent" INTEGER NOT NULL DEFAULT 89,
    "thresholdReadyToBuy" INTEGER NOT NULL DEFAULT 90,
    "ucHesitationMin" INTEGER NOT NULL DEFAULT 56,
    "ucHesitationMax" INTEGER NOT NULL DEFAULT 89,
    "ucLostBackNavMin" INTEGER NOT NULL DEFAULT 3,
    "ucCartHesitationSec" INTEGER NOT NULL DEFAULT 60,
    "maxAlternatives" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SubstitutionCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "targetProductId" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SmartRecEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "widgetType" TEXT,
    "productId" TEXT,
    "sessionId" TEXT,
    "intentScore" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SmartRecSettings_shop_key" ON "SmartRecSettings"("shop");

-- CreateIndex
CREATE INDEX "SubstitutionCache_shop_sourceProductId_idx" ON "SubstitutionCache"("shop", "sourceProductId");

-- CreateIndex
CREATE UNIQUE INDEX "SubstitutionCache_shop_sourceProductId_targetProductId_key" ON "SubstitutionCache"("shop", "sourceProductId", "targetProductId");

-- CreateIndex
CREATE INDEX "SmartRecEvent_shop_createdAt_idx" ON "SmartRecEvent"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "SmartRecEvent_shop_widgetType_idx" ON "SmartRecEvent"("shop", "widgetType");
