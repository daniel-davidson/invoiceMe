# Agent Rules (InvoiceMe)

## Source of truth
- The /specs folder is authoritative. Do not invent features, endpoints, or tables.

## Multi-tenancy (MANDATORY)
- tenantId = Supabase JWT `sub`.
- Every user-owned table includes tenantId.
- Every read/write query is filtered by tenantId. No exceptions.

## Domain definition (MANDATORY)
- "Business" in UI means "Vendor/Supplier" on the invoice (where money was spent).

## PDF/OCR rules (MANDATORY)
- If PDF has selectable text: extract it (no OCR).
- Else OCR the first 2 pages max (POC).
- OCR uses Tesseract with heb+eng.

## LLM rules (MANDATORY)
- Ollama structures OCR text into strict JSON for extraction.
- SQL computes totals/KPIs; LLM only summarizes/explains. LLM must not compute truth.

## Storage rules
- Store invoice files outside DB (filesystem). DB stores metadata + OCR/LLM artifacts.

## Scope rules
- Export for POC = generate CSV + download. Email/FTP integrations are out of scope unless explicitly added to specs.
