TEST FIXTURES DIRECTORY
=======================

Add the following sample files to run integration tests:

Required Files:
---------------
1. sample-invoice.pdf
   - Standard PDF invoice with selectable text
   - Should contain: vendor name, date, amount, currency

2. sample-invoice.jpg
   - Invoice photo/scan in JPEG format
   - Clear text for OCR testing

3. new-vendor-invoice.pdf
   - Invoice from a vendor NOT in the database
   - Used to test automatic vendor creation

4. google-invoice.pdf
   - Invoice with "Google" as vendor
   - Used to test vendor matching

5. euro-invoice.pdf
   - Invoice in EUR currency
   - Used to test currency conversion

6. blurry-invoice.jpg
   - Low-quality invoice image
   - Used to test low-confidence detection

Expected Invoice Fields:
------------------------
- Vendor/Supplier name
- Invoice date (any format)
- Total amount
- Currency (ISO 4217 code like USD, EUR, ILS)
- Optional: Invoice number, line items

Notes:
------
- Max 2MB file size recommended
- Hebrew + English text supported
- Landscape or portrait orientation accepted
- Keep sample files UNLISTED in git for privacy
