import { NextRequest, NextResponse } from 'next/server';
import { verifyLicenseCertificate } from '@/lib/licenseAgreement';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { certificateNumber: string } }
) {
  const { certificateNumber } = params;

  if (!certificateNumber) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Certificate number is required' },
      { status: 400 }
    );
  }

  try {
    const result = await verifyLicenseCertificate(certificateNumber);
    if (!result.isValid && !result.record) {
      return NextResponse.json(
        { error: 'Not Found', message: result.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/licenses/[certificateNumber]] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
