-- CreateTable
CREATE TABLE "SmartRecSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "ucHesitationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ucHesitationMin" INTEGER NOT NULL DEFAULT 56,
    "ucHesitationMax" INTEGER NOT NULL DEFAULT 89,
    "ucCompareEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ucLostEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ucLostBackNavMin" INTEGER NOT NULL DEFAULT 3,
    "ucCartEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ucCartHesitationSec" INTEGER NOT NULL DEFAULT 60,
    "maxAlternatives" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "productId" TEXT,
    "intentScore" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SmartRecSettings_shop_key" ON "SmartRecSettings"("shop");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shop_createdAt_idx" ON "AnalyticsEvent"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_widgetType_eventType_idx" ON "AnalyticsEvent"("widgetType", "eventType");
