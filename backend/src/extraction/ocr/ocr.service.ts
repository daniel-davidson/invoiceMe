import { Injectable, Logger } from '@nestjs/common';
import Tesseract from 'tesseract.js';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private worker: Tesseract.Worker | null = null;

  /**
   * Initialize Tesseract worker with Hebrew and English languages
   */
  async onModuleInit() {
    try {
      this.logger.log('Initializing Tesseract worker with heb+eng languages');
      this.worker = await Tesseract.createWorker(['heb', 'eng'], 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      this.logger.log('Tesseract worker initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Tesseract worker: ${error.message}`);
      // Don't throw - allow service to start, but OCR will fail gracefully
    }
  }

  /**
   * Clean up Tesseract worker on module destroy
   */
  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.terminate();
      this.logger.log('Tesseract worker terminated');
    }
  }

  /**
   * Perform OCR on an image or PDF buffer
   * @param buffer - Image or PDF buffer
   * @param mimeType - MIME type of the file
   * @returns Extracted text
   */
  async recognizeText(buffer: Buffer, mimeType: string): Promise<string> {
    if (!this.worker) {
      throw new Error('Tesseract worker not initialized');
    }

    try {
      this.logger.log(`Starting OCR for ${mimeType}`);
      const startTime = Date.now();

      // Tesseract.js can handle Buffer directly
      const result = await this.worker.recognize(buffer);

      const duration = Date.now() - startTime;
      const text = result.data.text.trim();

      this.logger.log(
        `OCR completed in ${duration}ms, extracted ${text.length} characters`,
      );

      return text;
    } catch (error) {
      this.logger.error(`OCR failed: ${error.message}`);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Perform OCR on multiple images
   * @param buffers - Array of image buffers
   * @returns Combined extracted text
   */
  async recognizeMultiple(buffers: Buffer[]): Promise<string> {
    const texts: string[] = [];

    for (let i = 0; i < buffers.length; i++) {
      this.logger.log(`Processing page ${i + 1}/${buffers.length}`);
      const text = await this.recognizeText(buffers[i], 'image/png');
      texts.push(text);
    }

    return texts.join('\n\n');
  }
}
