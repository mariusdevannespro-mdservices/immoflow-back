-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "accountingFeesAnnual" INTEGER,
ADD COLUMN     "expectedCapexAnnual" INTEGER,
ADD COLUMN     "furnished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "landShareRate" DOUBLE PRECISION DEFAULT 0.15,
ADD COLUMN     "otherIncomeMonthly" INTEGER,
ADD COLUMN     "propertyManagementFeeMonthly" INTEGER,
ADD COLUMN     "propertyManagementFeeRate" DOUBLE PRECISION,
ADD COLUMN     "recoverableChargesMonthly" INTEGER,
ADD COLUMN     "rentChargesIncluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rentGuaranteeInsuranceMonthly" INTEGER,
ADD COLUMN     "taxMode" TEXT NOT NULL DEFAULT 'micro';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "socialContribRate" DOUBLE PRECISION NOT NULL DEFAULT 0.172,
ADD COLUMN     "tmi" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "DepreciationAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "years" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepreciationAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepreciationAsset_projectId_idx" ON "DepreciationAsset"("projectId");

-- CreateIndex
CREATE INDEX "DepreciationAsset_category_idx" ON "DepreciationAsset"("category");

-- CreateIndex
CREATE INDEX "Project_taxMode_idx" ON "Project"("taxMode");

-- AddForeignKey
ALTER TABLE "DepreciationAsset" ADD CONSTRAINT "DepreciationAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
