# Golden Set - OCR Pipeline Test Data

This directory contains test invoices for evaluating the OCR pipeline quality.

## Directory Structure

```
golden-set/
├── hebrew-invoices/     # 10 Hebrew invoices with tables
├── receipts/            # 10 receipt photos (Hebrew/English)
├── english-invoices/    # 5 English invoices
├── pdfs-text/           # 5 PDFs with selectable text
└── pdfs-scanned/        # 5 scanned PDFs requiring OCR
```

## File Requirements

- **Images**: JPEG or PNG format
- **PDFs**: Any PDF (text-based or scanned)
- **Naming**: Use descriptive names (e.g., `ikea-invoice-2024-01.pdf`)

## Running Evaluation

To test the OCR pipeline against these files:

```bash
cd backend
npx ts-node scripts/evaluate-ocr.ts
```

## Expected Output

The evaluation script will print:
- OCR method used (pdf_text_extraction vs multi_pass_ocr)
- Chosen PSM pass and score
- Deterministic parsing candidates
- Extracted fields (vendor, date, total, currency)
- Processing time
- Summary statistics

## Adding Test Cases

1. Place test files in the appropriate subdirectory
2. Use real invoices or receipts (anonymize if needed)
3. Include variety: clear vs blurry, tables vs no tables, Hebrew vs English
4. Run evaluation to baseline quality before making changes

## Metrics to Track

- **Success rate**: % of files processed without errors
- **Extraction completeness**: % with vendor/total/date/currency extracted
- **Processing time**: Average ms per file
- **OCR quality**: Chosen pass score and confidence

Any changes to the OCR pipeline should be measured against this golden set to ensure quality improvements.
