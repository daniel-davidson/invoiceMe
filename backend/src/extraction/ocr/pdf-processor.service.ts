/**
 * Docs Verified: PDF Text Extraction
 * - pdf-parse: https://www.npmjs.com/package/pdf-parse
 * - pdf.js (underlying): https://mozilla.github.io/pdf.js/
 * - Verified on: 2026-01-19
 * - SDK: pdf-parse 1.1.1 (v2.x requires DOM polyfills not available in Node.js)
 */
import pdfParse from 'pdf-parse';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PdfProcessorService {
  private readonly logger = new Logger(PdfProcessorService.name);

  /**
   * Extract text from PDF if it has selectable text
   * @param buffer - PDF file buffer
   * @returns Extracted text or null if no text found
   */
  async extractTextFromPdf(buffer: Buffer): Promise<string | null> {
    const startTime = Date.now();
    try {
      // Parse PDF and extract text
      const data = await pdfParse(buffer);

      const text = data.text?.trim() || '';

      const duration = Date.now() - startTime;

      // Return text if it has meaningful content (> 50 chars)
      if (text.length > 50) {
        this.logger.log(
          `[PdfProcessorService] Extracted ${text.length} characters of text from PDF in ${duration}ms`,
        );
        return text;
      }

      this.logger.log(
        `[PdfProcessorService] PDF has insufficient selectable text (checked in ${duration}ms), will need OCR`,
      );
      return null;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[PdfProcessorService] Failed to extract text from PDF after ${duration}ms: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Convert PDF pages to images for OCR processing
   * Note: This is a placeholder - actual implementation would use pdf-poppler
   * For POC, we'll rely on Tesseract.js which can handle PDF directly
   * @param buffer - PDF file buffer
   * @returns Array of image buffers (first 2 pages max), or null on failure
   */
  async convertPdfToImages(buffer: Buffer): Promise<Buffer[] | null> {
    const startTime = Date.now();
    try {
      // For POC: Tesseract.js can handle PDF directly
      // In production, you'd use pdf-poppler to convert pages to images
      // This is a simplified implementation that returns the PDF buffer
      // Tesseract.js will handle the conversion internally
      const duration = Date.now() - startTime;
      this.logger.log(
        `[PdfProcessorService] PDF conversion took ${duration}ms`,
      );
      return [buffer];
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[PdfProcessorService] PDF conversion failed after ${duration}ms: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Detect if PDF has selectable text
   * @param buffer - PDF file buffer
   * @returns True if PDF has selectable text (> 50 chars)
   */
  async hasSelectableText(buffer: Buffer): Promise<boolean> {
    const text = await this.extractTextFromPdf(buffer);
    return text !== null && text.length > 50;
  }
}
