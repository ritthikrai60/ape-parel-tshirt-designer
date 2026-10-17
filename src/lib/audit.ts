import { prisma } from '@/lib/prisma';
import { AuditEvent, Prisma, PrismaClient } from '@prisma/client';

export type PrismaTransaction = Prisma.TransactionClient;
export type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export interface RecordAuditEventParams {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  userId?: string | null;
  payload?: Record<string, any> | string | null;
  metadata?: Record<string, any> | string | null;
}

export interface GetAuditEventsOptions {
  limit?: number;
  order?: 'asc' | 'desc';
  action?: string;
}

/**
 * Standard audit actions used across the ape-parel marketplace
 */
export const AuditAction = {
  // Orders & Lifecycle
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_STATUS_UPDATED: 'ORDER_STATUS_UPDATED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',

  // Royalties & Settlements
  ROYALTY_OBLIGATION_CREATED: 'ROYALTY_OBLIGATION_CREATED',
  ROYALTY_PAYOUT_SETTLED: 'ROYALTY_PAYOUT_SETTLED',
  PAYOUT_REQUESTED: 'PAYOUT_REQUESTED',
  PAYOUT_APPROVED: 'PAYOUT_APPROVED',
  PAYOUT_REJECTED: 'PAYOUT_REJECTED',

  // Artworks & Asset Uploads (M2)
  ARTWORK_UPLOADED: 'ARTWORK_UPLOADED',
  ARTWORK_UPDATED: 'ARTWORK_UPDATED',
  ARTWORK_DELETED: 'ARTWORK_DELETED',
  ARTWORK_APPROVED: 'ARTWORK_APPROVED',
  ARTWORK_REJECTED: 'ARTWORK_REJECTED',
  LICENSE_PRICE_UPDATED: 'LICENSE_PRICE_UPDATED',
  FILE_SPEC_VALIDATED: 'FILE_SPEC_VALIDATED',

  // Creator Storefront & Profile (M3)
  CREATOR_ONBOARDED: 'CREATOR_ONBOARDED',
  STOREFRONT_SETTINGS_UPDATED: 'STOREFRONT_SETTINGS_UPDATED',

  // Accounting & Financial Reconciliation (M4)
  JOURNAL_ENTRY_RECORDED: 'JOURNAL_ENTRY_RECORDED',
  RECONCILIATION_COMPLETED: 'RECONCILIATION_COMPLETED',
  BALANCE_ADJUSTMENT: 'BALANCE_ADJUSTMENT',

  // Order Communication & Anti-Fraud Audit
  CHAT_MESSAGE_FLAGGED: 'CHAT_MESSAGE_FLAGGED',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction] | string;

/**
 * Records an immutable AuditEvent in the database.
 * Supports standalone execution (using global prisma client) or execution
 * inside an existing Prisma transaction.
 * Automatically serializes payload and metadata objects to JSON strings.
 *
 * @param params Audit event fields
 * @param tx Optional Prisma transaction client
 * @returns The created AuditEvent record
 */
export async function recordAuditEvent(
  params: RecordAuditEventParams,
  tx?: PrismaClientOrTx
): Promise<AuditEvent> {
  const client = tx ?? prisma;

  const payloadString =
    params.payload === undefined || params.payload === null
      ? null
      : typeof params.payload === 'string'
      ? params.payload
      : JSON.stringify(params.payload);

  const metadataString =
    params.metadata === undefined || params.metadata === null
      ? null
      : typeof params.metadata === 'string'
      ? params.metadata
      : JSON.stringify(params.metadata);

  const actorId = params.actorId ?? params.userId ?? null;

  return await client.auditEvent.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      userId: params.userId ?? null,
      actorId,
      payload: payloadString,
      metadata: metadataString,
    },
  });
}

/**
 * Query audit events for a specific entity with optional ordering and filtering.
 */
export async function getAuditEventsForEntity(
  entityType: string,
  entityId: string,
  options?: GetAuditEventsOptions,
  tx?: PrismaClientOrTx
): Promise<AuditEvent[]> {
  const client = tx ?? prisma;
  return await client.auditEvent.findMany({
    where: {
      entityType,
      entityId,
      ...(options?.action ? { action: options.action } : {}),
    },
    orderBy: { createdAt: options?.order ?? 'desc' },
    take: options?.limit,
  });
}

/**
 * Retrieve the single most recent audit event for an entity.
 */
export async function getLatestAuditEvent(
  entityType: string,
  entityId: string,
  action?: string,
  tx?: PrismaClientOrTx
): Promise<AuditEvent | null> {
  const client = tx ?? prisma;
  return await client.auditEvent.findFirst({
    where: {
      entityType,
      entityId,
      ...(action ? { action } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Helper to safely parse stringified payload JSON.
 */
export function parseAuditPayload<T = Record<string, any>>(audit: { payload: string | null }): T | null {
  if (!audit.payload) return null;
  try {
    return JSON.parse(audit.payload) as T;
  } catch {
    return null;
  }
}

/**
 * Helper to safely parse stringified metadata JSON.
 */
export function parseAuditMetadata<T = Record<string, any>>(audit: { metadata?: string | null }): T | null {
  if (!audit.metadata) return null;
  try {
    return JSON.parse(audit.metadata) as T;
  } catch {
    return null;
  }
}
