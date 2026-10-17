import fs from 'fs';
import path from 'path';

export interface StorageResult {
  storageKey: string;     // Unique relative storage identifier (e.g., "masters/1728540000000_a1b2c3d4_graphic.png")
  relativeUrl: string;    // Web-accessible public URL with forward slashes (e.g., "/uploads/masters/1728540000000_a1b2c3d4_graphic.png")
  absolutePath: string;   // Full resolved OS filesystem path
}

export interface StorageService {
  /**
   * Save a print-ready master file into the masters directory.
   */
  saveMaster(buffer: Buffer, filename: string, mimeType?: string): Promise<StorageResult>;

  /**
   * Save a watermarked web preview file into the public previews directory.
   */
  savePreview(buffer: Buffer, filename: string, mimeType?: string): Promise<StorageResult>;

  /**
   * Retrieve the raw Buffer of a master file given its storage key or relative path.
   */
  getMasterBuffer(storageKeyOrPath: string): Promise<Buffer>;

  /**
   * Retrieve the raw Buffer of a preview file given its storage key or relative path.
   */
  getPreviewBuffer(storageKeyOrPath: string): Promise<Buffer>;

  /**
   * Delete a stored file by storage key or relative path.
   * Returns true if deleted, false if file did not exist.
   */
  deleteFile(storageKeyOrPath: string): Promise<boolean>;

  /**
   * Check if a file exists given its storage key or relative path.
   */
  exists(storageKeyOrPath: string): Promise<boolean>;

  /**
   * Convert a storage key or relative path to a web-accessible relative URL (/uploads/...).
   */
  getPublicUrl(storageKeyOrPath: string): string;

  /**
   * Resolve a storage key or relative path to an absolute filesystem path safely.
   * Defends against directory traversal attacks.
   */
  resolveAbsolutePath(storageKeyOrPath: string): string;
}

export interface LocalStorageOptions {
  baseUploadDir?: string;
  baseUrlPrefix?: string;
}

export class LocalStorageService implements StorageService {
  private readonly baseUploadDir: string;
  private readonly baseUrlPrefix: string;
  private readonly mastersDir: string;
  private readonly previewsDir: string;

  constructor(options?: LocalStorageOptions) {
    this.baseUploadDir = path.resolve(
      options?.baseUploadDir || path.join(process.cwd(), 'public', 'uploads')
    );
    this.baseUrlPrefix = options?.baseUrlPrefix || '/uploads';
    this.mastersDir = path.join(this.baseUploadDir, 'masters');
    this.previewsDir = path.join(this.baseUploadDir, 'previews');
  }

  // Ensures target directories exist recursively
  private async ensureDir(dirPath: string): Promise<void> {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  // Sanitizes filename to prevent directory traversal and special character bugs
  private sanitizeFilename(filename: string): { base: string; ext: string } {
    const parsed = path.parse(filename);
    const sanitizedBase = parsed.name
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80);
    const sanitizedExt = parsed.ext
      .replace(/[^a-zA-Z0-9\.]/g, '')
      .toLowerCase();
    return {
      base: sanitizedBase || 'file',
      ext: sanitizedExt,
    };
  }

  // Generates unique collision-resistant storage key
  private generateUniqueFilename(originalFilename: string, defaultExt?: string): string {
    const { base, ext } = this.sanitizeFilename(originalFilename);
    const fileExt = ext || (defaultExt ? `.${defaultExt.replace(/^\./, '')}` : '');
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    return `${timestamp}_${randomHex}_${base}${fileExt}`;
  }

  // Converts any path or key into web-safe URL with forward slashes
  public getPublicUrl(storageKeyOrPath: string): string {
    let cleanKey = storageKeyOrPath.replace(/\\/g, '/');
    if (cleanKey.startsWith('/uploads/')) {
      return cleanKey;
    }
    if (cleanKey.startsWith('uploads/')) {
      return '/' + cleanKey;
    }
    if (cleanKey.startsWith('public/uploads/')) {
      return cleanKey.replace(/^public/, '');
    }
    if (cleanKey.startsWith('/public/uploads/')) {
      return cleanKey.replace(/^\/public/, '');
    }
    cleanKey = cleanKey.replace(/^\/+/, '');
    return `${this.baseUrlPrefix}/${cleanKey}`.replace(/\/+/g, '/');
  }

  // Resolves absolute path and guards against directory traversal
  public resolveAbsolutePath(storageKeyOrPath: string): string {
    let normalized = storageKeyOrPath.replace(/\\/g, '/').trim();
    normalized = normalized.replace(/^\/?public\/uploads\//, '');
    normalized = normalized.replace(/^\/?uploads\//, '');
    normalized = normalized.replace(/^\/+/, '');

    const resolved = path.resolve(this.baseUploadDir, normalized);

    // Guard: resolved path must be within baseUploadDir
    const relative = path.relative(this.baseUploadDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Path traversal violation: Access outside uploads directory is forbidden (${storageKeyOrPath})`);
    }

    return resolved;
  }

  public async saveMaster(buffer: Buffer, filename: string, mimeType?: string): Promise<StorageResult> {
    await this.ensureDir(this.mastersDir);
    const uniqueFilename = this.generateUniqueFilename(filename);
    const storageKey = `masters/${uniqueFilename}`;
    const absolutePath = path.join(this.mastersDir, uniqueFilename);

    await fs.promises.writeFile(absolutePath, buffer);

    return {
      storageKey,
      relativeUrl: this.getPublicUrl(storageKey),
      absolutePath,
    };
  }

  public async savePreview(buffer: Buffer, filename: string, mimeType?: string): Promise<StorageResult> {
    await this.ensureDir(this.previewsDir);
    const uniqueFilename = this.generateUniqueFilename(filename, 'webp');
    const storageKey = `previews/${uniqueFilename}`;
    const absolutePath = path.join(this.previewsDir, uniqueFilename);

    await fs.promises.writeFile(absolutePath, buffer);

    return {
      storageKey,
      relativeUrl: this.getPublicUrl(storageKey),
      absolutePath,
    };
  }

  public async getMasterBuffer(storageKeyOrPath: string): Promise<Buffer> {
    let resolved = this.resolveAbsolutePath(storageKeyOrPath);
    if (!fs.existsSync(resolved) && !storageKeyOrPath.includes('masters')) {
      const inMasters = path.join(this.mastersDir, path.basename(storageKeyOrPath));
      if (fs.existsSync(inMasters)) {
        resolved = inMasters;
      }
    }
    return await fs.promises.readFile(resolved);
  }

  public async getPreviewBuffer(storageKeyOrPath: string): Promise<Buffer> {
    let resolved = this.resolveAbsolutePath(storageKeyOrPath);
    if (!fs.existsSync(resolved) && !storageKeyOrPath.includes('previews')) {
      const inPreviews = path.join(this.previewsDir, path.basename(storageKeyOrPath));
      if (fs.existsSync(inPreviews)) {
        resolved = inPreviews;
      }
    }
    return await fs.promises.readFile(resolved);
  }

  public async deleteFile(storageKeyOrPath: string): Promise<boolean> {
    try {
      const resolved = this.resolveAbsolutePath(storageKeyOrPath);
      if (fs.existsSync(resolved)) {
        await fs.promises.unlink(resolved);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async exists(storageKeyOrPath: string): Promise<boolean> {
    try {
      const resolved = this.resolveAbsolutePath(storageKeyOrPath);
      return fs.existsSync(resolved);
    } catch {
      return false;
    }
  }
}

export const storageService: StorageService = new LocalStorageService();
