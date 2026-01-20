-- Check the invoice data for debugging
SELECT 
  id,
  "tenantId",
  "vendorId",
  name,
  "originalAmount",
  "originalCurrency",
  "normalizedAmount",
  "invoiceDate",
  "createdAt"
FROM invoices 
WHERE "vendorId" = 'd485cdff-e3c2-4f44-b799-da8c7a7a7bef'
ORDER BY "createdAt" DESC
LIMIT 5;
