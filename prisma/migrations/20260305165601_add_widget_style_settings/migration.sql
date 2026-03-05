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
    "styleAccentColor" TEXT NOT NULL DEFAULT '#000000',
    "styleTextColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "styleBgColor" TEXT NOT NULL DEFAULT '#ffffff',
    "styleBorderRadius" INTEGER NOT NULL DEFAULT 8,
    "styleFontSize" INTEGER NOT NULL DEFAULT 14,
    "styleButtonStyle" TEXT NOT NULL DEFAULT 'filled',
    "stylePosition" TEXT NOT NULL DEFAULT 'default',
    "styleCustomCSS" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SmartRecSettings" ("alternativeNudge", "comparisonBar", "createdAt", "enabled", "id", "maxAlternatives", "shop", "tagNavigator", "thresholdBrowsing", "thresholdConsidering", "thresholdHighIntent", "thresholdReadyToBuy", "thresholdStrongIntent", "trustNudge", "ucCartHesitationSec", "ucHesitationMax", "ucHesitationMin", "ucLostBackNavMin", "updatedAt") SELECT "alternativeNudge", "comparisonBar", "createdAt", "enabled", "id", "maxAlternatives", "shop", "tagNavigator", "thresholdBrowsing", "thresholdConsidering", "thresholdHighIntent", "thresholdReadyToBuy", "thresholdStrongIntent", "trustNudge", "ucCartHesitationSec", "ucHesitationMax", "ucHesitationMin", "ucLostBackNavMin", "updatedAt" FROM "SmartRecSettings";
DROP TABLE "SmartRecSettings";
ALTER TABLE "new_SmartRecSettings" RENAME TO "SmartRecSettings";
CREATE UNIQUE INDEX "SmartRecSettings_shop_key" ON "SmartRecSettings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
