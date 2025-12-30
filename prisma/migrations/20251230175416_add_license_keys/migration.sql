-- AlterTable
ALTER TABLE "User" ADD COLUMN     "proPlusLifetime" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LicenseKey" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'pro_plus',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "redeemedById" TEXT,

    CONSTRAINT "LicenseKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LicenseKey_codeHash_key" ON "LicenseKey"("codeHash");

-- CreateIndex
CREATE INDEX "LicenseKey_redeemedById_idx" ON "LicenseKey"("redeemedById");

-- CreateIndex
CREATE INDEX "LicenseKey_isActive_idx" ON "LicenseKey"("isActive");

-- AddForeignKey
ALTER TABLE "LicenseKey" ADD CONSTRAINT "LicenseKey_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
