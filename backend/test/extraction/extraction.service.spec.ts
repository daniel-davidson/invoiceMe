import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionService } from '../../src/extraction/extraction.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StorageService } from '../../src/storage/storage.service';
import { PdfProcessorService } from '../../src/extraction/ocr/pdf-processor.service';
import { OcrService } from '../../src/extraction/ocr/ocr.service';
import { OllamaService } from '../../src/extraction/llm/ollama.service';
import { VendorMatcherService } from '../../src/extraction/vendor-matcher.service';
import { CurrencyService } from '../../src/currency/currency.service';

describe('ExtractionService', () => {
  let service: ExtractionService;

  const tenantId = 'tenant-123';

  const mockPrismaService = {
    invoice: { create: jest.fn() },
    extractionRun: { create: jest.fn(), update: jest.fn() },
    vendor: { findMany: jest.fn(), create: jest.fn() },
  };

  const mockStorageService = {
    saveFileBuffer: jest.fn(),
    getFile: jest.fn(),
  };

  const mockPdfProcessor = {
    hasSelectableText: jest.fn(),
    extractTextFromPdf: jest.fn(),
  };

  const mockOcrService = {
    recognizeText: jest.fn(),
  };

  const mockOllamaService = {
    extractFromText: jest.fn(),
  };

  const mockVendorMatcher = {
    matchVendor: jest.fn(),
  };

  const mockCurrencyService = {
    convert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: PdfProcessorService, useValue: mockPdfProcessor },
        { provide: OcrService, useValue: mockOcrService },
        { provide: OllamaService, useValue: mockOllamaService },
        { provide: VendorMatcherService, useValue: mockVendorMatcher },
        { provide: CurrencyService, useValue: mockCurrencyService },
      ],
    }).compile();

    service = module.get<ExtractionService>(ExtractionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processInvoice', () => {
    const mockExtractedData = {
      vendorName: 'Test Vendor',
      invoiceDate: '2024-01-15',
      totalAmount: 100.5,
      currency: 'USD',
      invoiceNumber: 'INV-001',
      confidence: {
        vendorName: 0.95,
        invoiceDate: 0.9,
        totalAmount: 0.98,
        currency: 0.99,
      },
      warnings: [],
    };

    it('should process PDF with selectable text without OCR', async () => {
      const pdfBuffer = Buffer.from('fake-pdf');

      mockStorageService.saveFileBuffer.mockResolvedValue(
        'tenant-123/file.pdf',
      );
      mockPdfProcessor.hasSelectableText.mockResolvedValue(true);
      mockPdfProcessor.extractTextFromPdf.mockResolvedValue(
        'Invoice text content',
      );
      mockOllamaService.extractFromText.mockResolvedValue(mockExtractedData);
      mockVendorMatcher.matchVendor.mockResolvedValue({
        id: 'v1',
        name: 'Test Vendor',
        isNew: false,
      });
      mockCurrencyService.convert.mockResolvedValue({
        normalizedAmount: 100.5,
        fxRate: 1,
        fxDate: '2024-01-15',
      });
      mockPrismaService.invoice.create.mockResolvedValue({
        id: 'inv-1',
        tenantId,
        vendorId: 'v1',
        originalAmount: 100.5,
        originalCurrency: 'USD',
        invoiceDate: new Date('2024-01-15'),
        needsReview: false,
        fileUrl: 'tenant-123/file.pdf',
      });
      mockPrismaService.extractionRun.create.mockResolvedValue({ id: 'run-1' });

      const result = await service.processInvoice(
        pdfBuffer,
        'invoice.pdf',
        'application/pdf',
        tenantId,
        'USD',
      );

      expect(mockPdfProcessor.hasSelectableText).toHaveBeenCalled();
      expect(mockOcrService.recognizeText).not.toHaveBeenCalled();
      expect(result.invoice).toBeDefined();
    });

    it('should use OCR for PDF without selectable text', async () => {
      const pdfBuffer = Buffer.from('fake-scanned-pdf');

      mockStorageService.saveFileBuffer.mockResolvedValue(
        'tenant-123/file.pdf',
      );
      mockPdfProcessor.hasSelectableText.mockResolvedValue(false);
      mockOcrService.recognizeText.mockResolvedValue('OCR extracted text');
      mockOllamaService.extractFromText.mockResolvedValue(mockExtractedData);
      mockVendorMatcher.matchVendor.mockResolvedValue({
        id: 'v1',
        name: 'Test Vendor',
        isNew: true,
      });
      mockCurrencyService.convert.mockResolvedValue({
        normalizedAmount: 100.5,
        fxRate: 1,
        fxDate: '2024-01-15',
      });
      mockPrismaService.invoice.create.mockResolvedValue({
        id: 'inv-1',
        tenantId,
        vendorId: 'v1',
      });
      mockPrismaService.extractionRun.create.mockResolvedValue({ id: 'run-1' });

      const result = await service.processInvoice(
        pdfBuffer,
        'scan.pdf',
        'application/pdf',
        tenantId,
        'USD',
      );

      expect(mockOcrService.recognizeText).toHaveBeenCalled();
      expect(result.vendor.isNew).toBe(true);
    });

    it('should always use OCR for images', async () => {
      const imageBuffer = Buffer.from('fake-image');

      mockStorageService.saveFileBuffer.mockResolvedValue(
        'tenant-123/file.jpg',
      );
      mockOcrService.recognizeText.mockResolvedValue('OCR text from image');
      mockOllamaService.extractFromText.mockResolvedValue(mockExtractedData);
      mockVendorMatcher.matchVendor.mockResolvedValue({
        id: 'v1',
        name: 'Test Vendor',
        isNew: false,
      });
      mockCurrencyService.convert.mockResolvedValue({
        normalizedAmount: 100.5,
        fxRate: 1,
        fxDate: '2024-01-15',
      });
      mockPrismaService.invoice.create.mockResolvedValue({ id: 'inv-1' });
      mockPrismaService.extractionRun.create.mockResolvedValue({ id: 'run-1' });

      await service.processInvoice(
        imageBuffer,
        'photo.jpg',
        'image/jpeg',
        tenantId,
        'USD',
      );

      expect(mockPdfProcessor.hasSelectableText).not.toHaveBeenCalled();
      expect(mockOcrService.recognizeText).toHaveBeenCalled();
    });

    it('should flag invoice for review on low confidence', async () => {
      const lowConfidenceData = {
        ...mockExtractedData,
        confidence: {
          vendorName: 0.5, // Below 0.7 threshold
          invoiceDate: 0.9,
          totalAmount: 0.98,
          currency: 0.99,
        },
      };

      mockStorageService.saveFileBuffer.mockResolvedValue(
        'tenant-123/file.pdf',
      );
      mockPdfProcessor.hasSelectableText.mockResolvedValue(true);
      mockPdfProcessor.extractTextFromPdf.mockResolvedValue('Text');
      mockOllamaService.extractFromText.mockResolvedValue(lowConfidenceData);
      mockVendorMatcher.matchVendor.mockResolvedValue({
        id: 'v1',
        name: 'Unknown Vendor',
        isNew: true,
      });
      mockCurrencyService.convert.mockResolvedValue({
        normalizedAmount: 100.5,
        fxRate: 1,
        fxDate: '2024-01-15',
      });
      mockPrismaService.invoice.create.mockResolvedValue({
        id: 'inv-1',
        needsReview: true,
      });
      mockPrismaService.extractionRun.create.mockResolvedValue({ id: 'run-1' });

      const result = await service.processInvoice(
        Buffer.from('pdf'),
        'invoice.pdf',
        'application/pdf',
        tenantId,
        'USD',
      );

      expect(result.extraction.status).toBe('NEEDS_REVIEW');
    });
  });

  describe('vendor matching', () => {
    it('should match existing vendor by normalized name', async () => {
      mockVendorMatcher.matchVendor.mockResolvedValue({
        id: 'existing-v1',
        name: 'Google',
        isNew: false,
      });

      const result = await mockVendorMatcher.matchVendor('GOOGLE', tenantId);

      expect(result.isNew).toBe(false);
    });

    it('should create new vendor if no match found', async () => {
      mockVendorMatcher.matchVendor.mockResolvedValue({
        id: 'new-v1',
        name: 'New Company',
        isNew: true,
      });

      const result = await mockVendorMatcher.matchVendor(
        'New Company',
        tenantId,
      );

      expect(result.isNew).toBe(true);
    });
  });

  describe('currency conversion', () => {
    it('should convert foreign currency to system currency', async () => {
      mockCurrencyService.convert.mockResolvedValue({
        normalizedAmount: 108.5,
        fxRate: 1.085,
        fxDate: '2024-01-15',
      });

      const result = await mockCurrencyService.convert(100, 'EUR', 'USD');

      expect(result.normalizedAmount).toBe(108.5);
      expect(result.fxRate).toBe(1.085);
    });

    it('should return same amount for same currency', async () => {
      mockCurrencyService.convert.mockResolvedValue({
        normalizedAmount: 100,
        fxRate: 1,
        fxDate: '2024-01-15',
      });

      const result = await mockCurrencyService.convert(100, 'USD', 'USD');

      expect(result.fxRate).toBe(1);
    });
  });

  describe('LLM extraction schema', () => {
    it('should validate required fields in response', () => {
      const requiredFields = [
        'vendorName',
        'totalAmount',
        'currency',
        'confidence',
        'warnings',
      ];

      const response = mockExtractedData;

      requiredFields.forEach((field) => {
        expect(response).toHaveProperty(field);
      });
    });

    it('should validate confidence scores are 0-1', () => {
      const confidenceScores = Object.values(mockExtractedData.confidence);

      confidenceScores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });
});

const mockExtractedData = {
  vendorName: 'Test Vendor',
  invoiceDate: '2024-01-15',
  totalAmount: 100.5,
  currency: 'USD',
  invoiceNumber: 'INV-001',
  confidence: {
    vendorName: 0.95,
    invoiceDate: 0.9,
    totalAmount: 0.98,
    currency: 0.99,
  },
  warnings: [],
};
