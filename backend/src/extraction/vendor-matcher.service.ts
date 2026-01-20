import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorMatcherService {
  private readonly logger = new Logger(VendorMatcherService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Normalize vendor name for matching
   * Removes extra whitespace, converts to lowercase, removes special characters
   * CRITICAL: Preserves Hebrew characters (U+0590-U+05FF) and other Unicode letters
   */
  normalizeVendorName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Remove special characters but KEEP Hebrew, Latin, digits, and spaces
      // Hebrew range: \u0590-\u05FF
      .replace(/[^\u0590-\u05FFa-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Match vendor by name with tenant scoping
   * Strategy: exact match → fuzzy match (Levenshtein ≤ 2) → create new vendor
   * @param vendorName - Vendor name from extraction
   * @param tenantId - Tenant ID for scoping
   * @returns Matched or newly created vendor
   */
  async matchVendor(
    vendorName: string,
    tenantId: string,
  ): Promise<{ id: string; name: string; isNew: boolean }> {
    const normalizedName = this.normalizeVendorName(vendorName);

    // Step 1: Try exact match on normalized name
    const vendors = await this.prisma.vendor.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    // Exact match
    for (const vendor of vendors) {
      if (this.normalizeVendorName(vendor.name) === normalizedName) {
        this.logger.log(`Exact match found for vendor: ${vendor.name}`);
        return { ...vendor, isNew: false };
      }
    }

    // Step 2: Fuzzy match (Levenshtein distance ≤ 2)
    for (const vendor of vendors) {
      const distance = this.levenshteinDistance(
        normalizedName,
        this.normalizeVendorName(vendor.name),
      );

      if (distance <= 2) {
        this.logger.log(
          `Fuzzy match found for vendor: ${vendor.name} (distance: ${distance})`,
        );
        return { ...vendor, isNew: false };
      }
    }

    // Step 3: Create new vendor
    this.logger.log(`Creating new vendor: ${vendorName}`);

    // Get the highest displayOrder for this tenant
    const maxOrderVendor = await this.prisma.vendor.findFirst({
      where: { tenantId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    const newVendor = await this.prisma.vendor.create({
      data: {
        name: vendorName, // Use original name, not normalized
        tenantId,
        displayOrder: (maxOrderVendor?.displayOrder ?? 0) + 1,
      },
      select: { id: true, name: true },
    });

    return { ...newVendor, isNew: true };
  }
}
