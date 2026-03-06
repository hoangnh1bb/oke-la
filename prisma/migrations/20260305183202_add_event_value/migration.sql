-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SmartRecEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "widgetType" TEXT,
    "productId" TEXT,
    "sessionId" TEXT,
    "intentScore" INTEGER,
    "value" REAL NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SmartRecEvent" ("createdAt", "eventType", "id", "intentScore", "metadata", "productId", "sessionId", "shop", "widgetType") SELECT "createdAt", "eventType", "id", "intentScore", "metadata", "productId", "sessionId", "shop", "widgetType" FROM "SmartRecEvent";
DROP TABLE "SmartRecEvent";
ALTER TABLE "new_SmartRecEvent" RENAME TO "SmartRecEvent";
CREATE INDEX "SmartRecEvent_shop_createdAt_idx" ON "SmartRecEvent"("shop", "createdAt");
CREATE INDEX "SmartRecEvent_shop_eventType_createdAt_idx" ON "SmartRecEvent"("shop", "eventType", "createdAt");
CREATE INDEX "SmartRecEvent_shop_widgetType_idx" ON "SmartRecEvent"("shop", "widgetType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
