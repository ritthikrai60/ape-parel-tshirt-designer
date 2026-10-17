import { NextRequest, NextResponse } from 'next/server';
import { getCreatorJournalData } from '@/lib/creatorJournal';

export const dynamic = 'force-dynamic';

/**
 * GET /api/creator/journal?creatorId=...
 * Query complete creator journal dataset: ledger summary, entries, 3% WHT, and 50 Tawi summary
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawParam = searchParams.get('creatorId') || searchParams.get('creator');
  const creatorId = rawParam?.trim();

  if (!creatorId) {
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Query parameter "creatorId" is required and cannot be empty.',
      },
      { status: 400 }
    );
  }

  try {
    const journalData = await getCreatorJournalData(creatorId);
    return NextResponse.json(journalData, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error retrieving creator journal';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message,
        },
        { status: 404 }
      );
    }

    console.error('[GET /api/creator/journal] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve creator journal data.',
      },
      { status: 500 }
    );
  }
}
