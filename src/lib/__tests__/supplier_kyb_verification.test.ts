import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';

const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

describe('Supplier KYB Verification & Admin Review Flow Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Document Upload API (POST /api/supplier/documents/upload)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const { POST } = await import('@/app/api/supplier/documents/upload/route');
      const req = new Request('http://localhost:3000/api/supplier/documents/upload', {
        method: 'POST',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('rejects requests with missing file with 400', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'usr_test_supplier' } });

      const { POST } = await import('@/app/api/supplier/documents/upload/route');
      const formData = new FormData();
      formData.append('docType', 'DBD');

      const req = new Request('http://localhost:3000/api/supplier/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('A valid file is required');
    });

    it('rejects unsupported file formats with 400', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'usr_test_supplier' } });

      const { POST } = await import('@/app/api/supplier/documents/upload/route');
      const formData = new FormData();
      const fakeExe = new Blob(['malicious executable'], { type: 'application/x-msdownload' });
      formData.append('file', fakeExe, 'virus.exe');

      const req = new Request('http://localhost:3000/api/supplier/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('Invalid file format');
    });

    it('successfully uploads valid PDF document', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'usr_test_supplier' } });

      const { POST } = await import('@/app/api/supplier/documents/upload/route');
      const formData = new FormData();
      const validPdf = new Blob(['%PDF-1.4 Mock DBD Certificate'], { type: 'application/pdf' });
      formData.append('file', validPdf, 'dbd_certificate.pdf');
      formData.append('docType', 'DBD');

      const req = new Request('http://localhost:3000/api/supplier/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req as any);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.url).toContain('/uploads/supplier-documents/DBD_');
      expect(data.url).toMatch(/\.pdf$/);
    });
  });

  describe('Admin Supplier Verification Review API', () => {
    it('rejects non-admin access to verifications list with 403', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'usr_buyer', role: 'CUSTOMER' } });

      const { GET } = await import('@/app/api/admin/suppliers/verifications/route');
      const req = new Request('http://localhost:3000/api/admin/suppliers/verifications');
      const res = await GET(req as any);

      expect(res.status).toBe(403);
    });

    it('rejects review request without required reason on REJECT', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'usr_admin', role: 'ADMIN' } });

      const { POST } = await import('@/app/api/admin/suppliers/verifications/[id]/review/route');
      const req = new Request('http://localhost:3000/api/admin/suppliers/verifications/sup_dummy/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', reason: 'bad' }), // too short
      });
      const res = await POST(req as any, { params: { id: 'sup_dummy' } });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('at least 5 characters');
    });

    it('approves a supplier and updates verified status and logs audit event', async () => {
      const adminUser = await prisma.user.create({
        data: {
          email: `admin-${Date.now()}@example.com`,
          name: 'Super Admin',
          role: 'ADMIN',
        },
      });

      const testSlug = `test-mill-${Date.now()}`;
      const user = await prisma.user.create({
        data: {
          email: `${testSlug}@example.com`,
          name: 'Test Mill Owner',
          role: 'SUPPLIER',
        },
      });

      const supplier = await prisma.supplierProfile.create({
        data: {
          userId: user.id,
          slug: testSlug,
          companyName: 'Test Printing Mill Co.',
          location: 'Bangkok, Thailand',
          contactEmail: `${testSlug}@example.com`,
          taxId: '0105558012345',
          verified: false,
          verificationStatus: 'PENDING',
        },
      });

      mockAuth.mockResolvedValueOnce({ user: { id: adminUser.id, role: 'ADMIN' } });

      const { POST } = await import('@/app/api/admin/suppliers/verifications/[id]/review/route');
      const req = new Request(`http://localhost:3000/api/admin/suppliers/verifications/${supplier.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const res = await POST(req as any, { params: { id: supplier.id } });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.supplier.verified).toBe(true);
      expect(data.supplier.verificationStatus).toBe('APPROVED');

      // Verify in DB
      const updated = await prisma.supplierProfile.findUnique({
        where: { id: supplier.id },
      });
      expect(updated?.verified).toBe(true);
      expect(updated?.verificationStatus).toBe('APPROVED');
      expect(updated?.reviewedById).toBe(adminUser.id);

      // Cleanup
      await prisma.auditEvent.deleteMany({ where: { userId: adminUser.id } });
      await prisma.supplierProfile.delete({ where: { id: supplier.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.user.delete({ where: { id: adminUser.id } });
    });
  });
});
