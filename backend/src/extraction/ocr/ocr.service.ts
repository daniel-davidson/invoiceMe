/**
 * Enhanced OCR Service with preprocessing and multi-pass recognition
 * 
 * Docs Verified: Tesseract.js OCR
 * - Official docs: https://tesseract.projectnaptha.com/
 * - API Reference: https://github.com/naptha/tesseract.js/blob/master/docs/api.md
 * - PSM modes: https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html#page-segmentation-method
 * - Verified on: 2026-01-19
 * - SDK: tesseract.js ^7.0.0, sharp ^0.33.x
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

interface OcrResult {
  text: string;
  psm: number;
  score: number;
  confidence: number;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private worker: Tesseract.Worker | null = null;
  private readonly debugMode: boolean;

  // PSM modes to try in multi-pass OCR
  private readonly PSM_MODES = [
    { psm: 6, name: 'block_of_text' },     // Assume uniform block of text
    { psm: 4, name: 'single_column' },     // Single column of text
    { psm: 11, name: 'sparse_text' },      // Sparse text, find as much as possible
    { psm: 3, name: 'auto_page' },         // Fully automatic page segmentation
    { psm: 12, name: 'sparse_osd' },       // Sparse text with OSD
  ];

  constructor(private configService: ConfigService) {
    this.debugMode = process.env.OCR_DEBUG === 'true' || process.env.NODE_ENV === 'development';
  }

  /**
   * Initialize Tesseract worker with Hebrew and English languages
   */
  async onModuleInit() {
    try {
      this.logger.log('Initializing Tesseract worker with heb+eng languages');
      this.worker = await Tesseract.createWorker(['heb', 'eng'], 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && this.debugMode) {
            this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // Set parameters for better Hebrew+English extraction
      await this.worker.setParameters({
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: '', // Allow all characters
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
   * Preprocess image for better OCR accuracy
   * @param buffer - Input image buffer
   * @returns Preprocessed image buffer
   */
  private async preprocessImage(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      this.logger.debug(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

      // Calculate target dimensions (aim for ~300 DPI equivalent)
      const minDimension = 1500; // Target minimum dimension
      let resizeWidth: number | undefined;
      let resizeHeight: number | undefined;

      if (metadata.width && metadata.height) {
        const maxDim = Math.max(metadata.width, metadata.height);
        if (maxDim < minDimension) {
          // Scale up small images
          const scale = minDimension / maxDim;
          resizeWidth = Math.round(metadata.width * scale);
          resizeHeight = Math.round(metadata.height * scale);
        }
      }

      // Preprocessing pipeline
      let processed = image
        .rotate() // Auto-rotate based on EXIF
        .grayscale() // Convert to grayscale
        .normalize(); // Normalize contrast

      // Resize if needed
      if (resizeWidth && resizeHeight) {
        this.logger.debug(`Scaling up to ${resizeWidth}x${resizeHeight}`);
        processed = processed.resize(resizeWidth, resizeHeight, {
          kernel: sharp.kernel.lanczos3,
          fit: 'fill',
        });
      }

      // Apply contrast enhancement and thresholding
      const preprocessed = await processed
        .linear(1.2, -(128 * 0.2)) // Increase contrast
        .sharpen({ sigma: 0.5 }) // Slight sharpen
        .threshold(128) // Binarization
        .png() // Convert to PNG for Tesseract
        .toBuffer();

      this.logger.debug('Image preprocessing completed');
      return preprocessed;
    } catch (error) {
      this.logger.warn(`Image preprocessing failed: ${error.message}, using original`);
      return buffer;
    }
  }

  /**
   * Score OCR text based on invoice-relevant content
   * @param text - OCR extracted text
   * @returns Score (higher is better)
   */
  private scoreOcrText(text: string): number {
    let score = 0;

    // Money keywords (Hebrew and English)
    const moneyKeywords = [
      /סה["״']?כ/gi,              // Total (Hebrew)
      /לתשלום/gi,                  // To pay (Hebrew)
      /יתרה\s*לתשלום/gi,          // Balance due (Hebrew)
      /מע["״']?מ/gi,              // VAT (Hebrew)
      /חשבונית/gi,                 // Invoice (Hebrew)
      /קבלה/gi,                    // Receipt (Hebrew)
      /\btotal\b/gi,               // Total (English)
      /\bamount\s+due\b/gi,        // Amount due (English)
      /\binvoice\b/gi,             // Invoice (English)
      /\breceipt\b/gi,             // Receipt (English)
      /\bVAT\b/g,                  // VAT (English)
    ];

    moneyKeywords.forEach(regex => {
      const matches = text.match(regex);
      if (matches) {
        score += matches.length * 10; // 10 points per keyword match
      }
    });

    // Money-like numbers (e.g., 120.50, ₪150.00, $99.99)
    const moneyPattern = /[₪$€£]?\s*\d{1,10}[.,]\d{2}\b/g;
    const moneyMatches = text.match(moneyPattern);
    if (moneyMatches) {
      score += moneyMatches.length * 5; // 5 points per money-like number
    }

    // Date-like patterns
    const datePatterns = [
      /\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/g,  // dd/mm/yyyy, dd.mm.yy
      /\b\d{4}-\d{2}-\d{2}\b/g,                     // yyyy-mm-dd
      /\b\d{1,2}\s+[א-ת]{3,10}\s+\d{4}\b/g,       // Hebrew dates
    ];

    datePatterns.forEach(regex => {
      const matches = text.match(regex);
      if (matches) {
        score += matches.length * 3; // 3 points per date
      }
    });

    // Text length bonus (longer text often means better OCR)
    score += Math.min(text.length / 100, 20); // Up to 20 bonus points

    // Penalty for excessive special characters (often OCR noise)
    const specialChars = text.match(/[^\w\s\u0590-\u05FF.,!?@#$%&*()₪€£]/g);
    if (specialChars && specialChars.length > text.length * 0.1) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Run OCR with a specific PSM mode
   * @param buffer - Preprocessed image buffer
   * @param psm - Page segmentation mode
   * @param modeName - Human-readable PSM name
   * @returns OCR result with text, score, and confidence
   */
  private async runOcrWithPSM(
    buffer: Buffer,
    psm: number,
    modeName: string,
  ): Promise<OcrResult> {
    if (!this.worker) {
      throw new Error('Tesseract worker not initialized');
    }

    const startTime = Date.now();

    // Set PSM mode (Tesseract.PSM is an enum, values map to numbers)
    await this.worker.setParameters({
      tessedit_pageseg_mode: psm as unknown as Tesseract.PSM,
    });

    // Run OCR
    const result = await this.worker.recognize(buffer);
    const text = result.data.text.trim();
    const confidence = result.data.confidence;
    const score = this.scoreOcrText(text);
    const duration = Date.now() - startTime;

    if (this.debugMode) {
      this.logger.debug(
        `PSM ${psm} (${modeName}): ${duration}ms, ${text.length} chars, score=${score.toFixed(1)}, conf=${confidence.toFixed(1)}%`,
      );
    }

    return { text, psm, score, confidence };
  }

  /**
   * Perform multi-pass OCR with different PSM modes and select the best result
   * @param buffer - Image or PDF buffer
   * @param mimeType - MIME type of the file
   * @returns Best extracted text
   */
  async recognizeText(buffer: Buffer, mimeType: string): Promise<string> {
    if (!this.worker) {
      throw new Error('Tesseract worker not initialized');
    }

    try {
      this.logger.log(`Starting enhanced multi-pass OCR for ${mimeType}`);
      const totalStartTime = Date.now();

      // Step 1: Preprocess image
      const preprocessed = await this.preprocessImage(buffer);

      // Step 2: Run OCR with multiple PSM modes
      const results: OcrResult[] = [];

      for (const { psm, name } of this.PSM_MODES) {
        try {
          const result = await this.runOcrWithPSM(preprocessed, psm, name);
          results.push(result);
        } catch (error) {
          this.logger.warn(`PSM ${psm} (${name}) failed: ${error.message}`);
        }
      }

      if (results.length === 0) {
        throw new Error('All PSM modes failed');
      }

      // Step 3: Select best result based on score
      const bestResult = results.reduce((best, current) =>
        current.score > best.score ? current : best,
      );

      const totalDuration = Date.now() - totalStartTime;

      // Step 4: Log results
      this.logger.log(
        `Multi-pass OCR completed in ${totalDuration}ms: ` +
        `Best PSM=${bestResult.psm}, score=${bestResult.score.toFixed(1)}, ` +
        `conf=${bestResult.confidence.toFixed(1)}%, ${bestResult.text.length} chars`,
      );

      if (this.debugMode) {
        // Log preview of chosen text
        const preview = this.getTextPreview(bestResult.text);
        this.logger.debug(`OCR Preview:\n${preview}`);

        // Log all scores for comparison
        const scoreTable = results
          .sort((a, b) => b.score - a.score)
          .map(r => `  PSM ${r.psm}: score=${r.score.toFixed(1)}, conf=${r.confidence.toFixed(1)}%, chars=${r.text.length}`)
          .join('\n');
        this.logger.debug(`All PSM scores:\n${scoreTable}`);
      }

      return bestResult.text;
    } catch (error) {
      this.logger.error(`Enhanced OCR failed: ${error.message}`);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Get preview of text (first 400 + last 400 chars)
   * @param text - Full text
   * @returns Preview string
   */
  private getTextPreview(text: string): string {
    if (text.length <= 800) {
      return text;
    }

    const head = text.substring(0, 400);
    const tail = text.substring(text.length - 400);

    return `${head}\n\n[... ${text.length - 800} chars omitted ...]\n\n${tail}`;
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

    return texts.join('\n\n--- PAGE BREAK ---\n\n');
  }
}
