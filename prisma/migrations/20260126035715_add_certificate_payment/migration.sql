-- CreateTable
CREATE TABLE "CertificatePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripePaymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "pdfDownloaded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificatePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificatePayment_stripePaymentId_key" ON "CertificatePayment"("stripePaymentId");

-- CreateIndex
CREATE INDEX "CertificatePayment_userId_idx" ON "CertificatePayment"("userId");

-- CreateIndex
CREATE INDEX "CertificatePayment_stripePaymentId_idx" ON "CertificatePayment"("stripePaymentId");

-- CreateIndex
CREATE INDEX "CertificatePayment_status_idx" ON "CertificatePayment"("status");

-- AddForeignKey
ALTER TABLE "CertificatePayment" ADD CONSTRAINT "CertificatePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
