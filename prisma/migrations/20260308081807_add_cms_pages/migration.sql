-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_key_key" ON "CmsPage"("key");

-- CreateIndex
CREATE INDEX "CmsPage_key_idx" ON "CmsPage"("key");
