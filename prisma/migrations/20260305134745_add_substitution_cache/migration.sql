-- CreateTable
CREATE TABLE "SubstitutionCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "targetProductId" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SubstitutionCache_shop_sourceProductId_idx" ON "SubstitutionCache"("shop", "sourceProductId");

-- CreateIndex
CREATE UNIQUE INDEX "SubstitutionCache_shop_sourceProductId_targetProductId_key" ON "SubstitutionCache"("shop", "sourceProductId", "targetProductId");
