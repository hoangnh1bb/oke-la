/*
  Warnings:

  - You are about to drop the `AnalyticsEvent` table. If the table is not empty, all the data it contains will be lost.
  - The primary key for the `SmartRecSettings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `ucCartEnabled` on the `SmartRecSettings` table. All the data in the column will be lost.
  - You are about to drop the column `ucCompareEnabled` on the `SmartRecSettings` table. All the data in the column will be lost.
  - You are about to drop the column `ucHesitationEnabled` on the `SmartRecSettings` table. All the data in the column will be lost.
  - You are about to drop the column `ucLostEnabled` on the `SmartRecSettings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AnalyticsEvent_widgetType_eventType_idx";

-- DropIndex
DROP INDEX "AnalyticsEvent_shop_createdAt_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AnalyticsEvent";
PRAGMA foreign_keys=on;

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

-- CreateTable
CREATE TABLE "smartrec_shop_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "thresholdBrowsing" INTEGER NOT NULL DEFAULT 30,
    "thresholdConsidering" INTEGER NOT NULL DEFAULT 55,
    "thresholdHighConsideration" INTEGER NOT NULL DEFAULT 75,
    "thresholdStrongIntent" INTEGER NOT NULL DEFAULT 89,
    "widgetAlternativeNudge" BOOLEAN NOT NULL DEFAULT true,
    "widgetComparisonBar" BOOLEAN NOT NULL DEFAULT true,
    "widgetTagNavigator" BOOLEAN NOT NULL DEFAULT true,
    "widgetTrustNudge" BOOLEAN NOT NULL DEFAULT true,
    "aiExplanationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiQuizEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiVisualEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiConciergeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "smartrec_product_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT '',
    "price" REAL NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "availableForSale" BOOLEAN NOT NULL DEFAULT true,
    "cachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "smartrec_signal_aggregates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "avgTimeOnPage" REAL NOT NULL DEFAULT 0,
    "addToCartCount" INTEGER NOT NULL DEFAULT 0,
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "backNavCount" INTEGER NOT NULL DEFAULT 0,
    "substitutionProductIds" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "smartrec_action_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "productId" TEXT,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "convertedToCart" BOOLEAN NOT NULL DEFAULT false,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "smartrec_product_embeddings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vector" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "smartrec_product_image_embeddings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "vector" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "smartrec_explainer_cache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "productAId" TEXT NOT NULL,
    "productBId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'template',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "smartrec_quiz_configs" (
    "shopId" TEXT NOT NULL PRIMARY KEY,
    "config" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "smartrec_llm_request_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "costUsd" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SmartRecSettings" (
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
INSERT INTO "new_SmartRecSettings" ("createdAt", "enabled", "id", "maxAlternatives", "shop", "ucCartHesitationSec", "ucHesitationMax", "ucHesitationMin", "ucLostBackNavMin", "updatedAt") SELECT "createdAt", "enabled", "id", "maxAlternatives", "shop", "ucCartHesitationSec", "ucHesitationMax", "ucHesitationMin", "ucLostBackNavMin", "updatedAt" FROM "SmartRecSettings";
DROP TABLE "SmartRecSettings";
ALTER TABLE "new_SmartRecSettings" RENAME TO "SmartRecSettings";
CREATE UNIQUE INDEX "SmartRecSettings_shop_key" ON "SmartRecSettings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SmartRecEvent_shop_createdAt_idx" ON "SmartRecEvent"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "SmartRecEvent_shop_widgetType_idx" ON "SmartRecEvent"("shop", "widgetType");

-- CreateIndex
CREATE UNIQUE INDEX "smartrec_shop_settings_shop_key" ON "smartrec_shop_settings"("shop");

-- CreateIndex
CREATE INDEX "smartrec_product_cache_shop_productType_idx" ON "smartrec_product_cache"("shop", "productType");

-- CreateIndex
CREATE UNIQUE INDEX "smartrec_product_cache_shop_shopifyProductId_key" ON "smartrec_product_cache"("shop", "shopifyProductId");

-- CreateIndex
CREATE INDEX "smartrec_signal_aggregates_shop_idx" ON "smartrec_signal_aggregates"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "smartrec_signal_aggregates_shop_shopifyProductId_key" ON "smartrec_signal_aggregates"("shop", "shopifyProductId");

-- CreateIndex
CREATE INDEX "smartrec_action_logs_shop_actionType_idx" ON "smartrec_action_logs"("shop", "actionType");

-- CreateIndex
CREATE INDEX "smartrec_action_logs_shop_createdAt_idx" ON "smartrec_action_logs"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "smartrec_product_embeddings_shopId_idx" ON "smartrec_product_embeddings"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "smartrec_product_embeddings_shopId_productId_key" ON "smartrec_product_embeddings"("shopId", "productId");

-- CreateIndex
CREATE INDEX "smartrec_product_image_embeddings_shopId_idx" ON "smartrec_product_image_embeddings"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "smartrec_product_image_embeddings_shopId_productId_key" ON "smartrec_product_image_embeddings"("shopId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "smartrec_explainer_cache_shopId_productAId_productBId_key" ON "smartrec_explainer_cache"("shopId", "productAId", "productBId");

-- CreateIndex
CREATE INDEX "smartrec_llm_request_logs_shopId_createdAt_idx" ON "smartrec_llm_request_logs"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "smartrec_llm_request_logs_shopId_feature_idx" ON "smartrec_llm_request_logs"("shopId", "feature");
