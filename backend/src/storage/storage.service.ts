import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as mime from 'mime-types';

@Injectable()
export class StorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  /**
   * Save a file to the tenant-scoped directory
   * @param tenantId - The tenant ID for scoping
   * @param file - Multer file object
   * @returns The relative file path
   */
  async saveFile(
    tenantId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    // Create tenant directory if it doesn't exist
    const tenantDir = path.join(this.uploadDir, tenantId);
    await fs.mkdir(tenantDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(tenantDir, filename);

    // Write file
    await fs.writeFile(filePath, file.buffer);

    // Return relative path
    return path.join(tenantId, filename);
  }

  /**
   * Save a file buffer to the tenant-scoped directory
   * @param tenantId - The tenant ID for scoping
   * @param buffer - File buffer
   * @param originalName - Original filename for extension
   * @returns The relative file path
   */
  async saveFileBuffer(
    tenantId: string,
    buffer: Buffer,
    originalName: string,
  ): Promise<string> {
    // Create tenant directory if it doesn't exist
    const tenantDir = path.join(this.uploadDir, tenantId);
    await fs.mkdir(tenantDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(originalName);
    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(tenantDir, filename);

    // Write file
    await fs.writeFile(filePath, buffer);

    // Return relative path
    return path.join(tenantId, filename);
  }

  /**
   * Get a file from storage
   * @param relativePath - The relative path to the file
   * @returns Object with buffer, mimeType, and fileName
   */
  async getFile(relativePath: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const filePath = path.join(this.uploadDir, relativePath);
    const fileName = path.basename(relativePath);

    try {
      const buffer = await fs.readFile(filePath);
      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      return { buffer, mimeType, fileName };
    } catch (error) {
      throw new NotFoundException(`File not found: ${relativePath}`);
    }
  }

  /**
   * Delete a file from storage
   * @param relativePath - The relative path to the file
   */
  async deleteFile(relativePath: string): Promise<void> {
    const filePath = path.join(this.uploadDir, relativePath);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Get the absolute path for a relative file path
   * @param relativePath - The relative path to the file
   * @returns The absolute file path
   */
  getAbsolutePath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }

  /**
   * Check if a file exists
   * @param relativePath - The relative path to the file
   * @returns True if file exists
   */
  async fileExists(relativePath: string): Promise<boolean> {
    const filePath = path.join(this.uploadDir, relativePath);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
