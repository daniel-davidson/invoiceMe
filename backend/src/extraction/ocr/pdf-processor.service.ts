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
    try {
      // Parse PDF and extract text
      const data = await pdfParse(buffer);

      const text = data.text?.trim() || '';

      // Return text if it has meaningful content (> 50 chars)
      if (text.length > 50) {
        this.logger.log(
          `Extracted ${text.length} characters of text from PDF`,
        );
        return text;
      }

      this.logger.log('PDF has insufficient selectable text, will need OCR');
      return null;
    } catch (error) {
      this.logger.error(`Failed to extract text from PDF: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert PDF pages to images for OCR processing
   * Note: This is a placeholder - actual implementation would use pdf-poppler
   * For POC, we'll rely on Tesseract.js which can handle PDF directly
   * @param buffer - PDF file buffer
   * @returns Array of image buffers (first 2 pages max)
   */
  async convertPdfToImages(buffer: Buffer): Promise<Buffer[]> {
    // For POC: Tesseract.js can handle PDF directly
    // In production, you'd use pdf-poppler to convert pages to images
    // This is a simplified implementation that returns the PDF buffer
    // Tesseract.js will handle the conversion internally
    this.logger.log('PDF will be processed directly by Tesseract.js');
    return [buffer];
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
