-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "sectionId" TEXT,
    "sectionNumber" INTEGER,
    "quizCompleted" BOOLEAN NOT NULL DEFAULT false,
    "quizScore" INTEGER,
    "quizTotal" INTEGER,
    "lastAccessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctAnswer" INTEGER NOT NULL,
    "explanation" JSONB NOT NULL,
    "questionAudioUrl" TEXT,
    "questionTimestampsUrl" TEXT,
    "optionAudioUrls" JSONB,
    "optionTimestampsUrls" JSONB,
    "correctExplanationAudioUrl" TEXT,
    "correctExplanationTimestampsUrl" TEXT,
    "incorrectExplanationAudioUrls" JSONB,
    "incorrectExplanationTimestampsUrls" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserProgress_userId_idx" ON "UserProgress"("userId");

-- CreateIndex
CREATE INDEX "UserProgress_chapterNumber_idx" ON "UserProgress"("chapterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_chapterNumber_key" ON "UserProgress"("userId", "chapterNumber");

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
