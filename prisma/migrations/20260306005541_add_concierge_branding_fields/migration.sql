-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_smartrec_shop_settings" (
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
    "agentName" TEXT NOT NULL DEFAULT 'SmartRec Assistant',
    "agentColor" TEXT NOT NULL DEFAULT '#4A90E2',
    "proactiveMessage" TEXT NOT NULL DEFAULT 'Hi! Want to know more about this product?',
    "systemPromptOverride" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_smartrec_shop_settings" ("aiConciergeEnabled", "aiExplanationsEnabled", "aiQuizEnabled", "aiVisualEnabled", "createdAt", "enabled", "id", "shop", "thresholdBrowsing", "thresholdConsidering", "thresholdHighConsideration", "thresholdStrongIntent", "updatedAt", "widgetAlternativeNudge", "widgetComparisonBar", "widgetTagNavigator", "widgetTrustNudge") SELECT "aiConciergeEnabled", "aiExplanationsEnabled", "aiQuizEnabled", "aiVisualEnabled", "createdAt", "enabled", "id", "shop", "thresholdBrowsing", "thresholdConsidering", "thresholdHighConsideration", "thresholdStrongIntent", "updatedAt", "widgetAlternativeNudge", "widgetComparisonBar", "widgetTagNavigator", "widgetTrustNudge" FROM "smartrec_shop_settings";
DROP TABLE "smartrec_shop_settings";
ALTER TABLE "new_smartrec_shop_settings" RENAME TO "smartrec_shop_settings";
CREATE UNIQUE INDEX "smartrec_shop_settings_shop_key" ON "smartrec_shop_settings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
