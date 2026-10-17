import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MIME_EXT_MAP: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const docType = (formData.get('docType') as string) || 'DOCUMENT';

    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'A valid file is required' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'File size exceeds maximum limit of 10MB' },
        { status: 400 }
      );
    }

    const mimeType = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid file format. Allowed formats: PDF, JPG, PNG, WEBP',
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'supplier-documents');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const ext = MIME_EXT_MAP[mimeType] || '.bin';
    const randomHex = crypto.randomBytes(8).toString('hex');
    const sanitizedPrefix = docType.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 15);
    const filename = `${sanitizedPrefix}_${Date.now()}_${randomHex}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/supplier-documents/${filename}`;

    return NextResponse.json({
      success: true,
      url: relativeUrl,
      filename,
      size: file.size,
      mimeType,
      docType,
    });
  } catch (error: any) {
    console.error('[SupplierDocUpload] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}
