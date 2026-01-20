-- CreateTable: InvoiceItem for normalized line item storage
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3),
    "unitPrice" DECIMAL(15,2),
    "total" DECIMAL(15,2) NOT NULL,
    "currency" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- AddColumn: fileHash for duplicate detection
ALTER TABLE "invoices" ADD COLUMN "fileHash" TEXT;

-- AddColumn: useItemsTotal toggle for auto-calculation
ALTER TABLE "invoices" ADD COLUMN "useItemsTotal" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex: invoice_items by invoiceId
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex: invoice_items by tenantId (for tenant scoping)
CREATE INDEX "invoice_items_tenantId_idx" ON "invoice_items"("tenantId");

-- CreateIndex: invoice_items by invoiceId + displayOrder (for ordered lists)
CREATE INDEX "invoice_items_invoiceId_displayOrder_idx" ON "invoice_items"("invoiceId", "displayOrder");

-- CreateIndex: invoices by fileHash (for dedupe lookup)
CREATE INDEX "invoices_tenantId_fileHash_idx" ON "invoices"("tenantId", "fileHash");

-- CreateUniqueConstraint: Prevent duplicate file uploads per tenant
CREATE UNIQUE INDEX "invoices_tenantId_fileHash_key" ON "invoices"("tenantId", "fileHash");

-- AddForeignKey: InvoiceItem to Invoice
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
