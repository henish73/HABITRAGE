-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "transfer_group_id" TEXT,
ADD COLUMN     "transfer_kind" TEXT;

-- CreateIndex
CREATE INDEX "transactions_owner_id_transfer_group_id_idx" ON "transactions"("owner_id", "transfer_group_id");
