-- CreateTable
CREATE TABLE "ChapterQuizSettings" (
    "id" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterQuizSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamChapterSettings" (
    "id" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamChapterSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChapterQuizSettings_chapterNumber_key" ON "ChapterQuizSettings"("chapterNumber");

-- CreateIndex
CREATE INDEX "ChapterQuizSettings_chapterNumber_idx" ON "ChapterQuizSettings"("chapterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExamChapterSettings_chapterNumber_key" ON "ExamChapterSettings"("chapterNumber");

-- CreateIndex
CREATE INDEX "ExamChapterSettings_chapterNumber_idx" ON "ExamChapterSettings"("chapterNumber");
