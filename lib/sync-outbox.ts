import type { RecordType } from '@/lib/types';

export interface SyncOperation {
  id: string;
  recordId: string;
  recordType: RecordType;
  baseVersion: number;
  ciphertext: string;
  deleted: boolean;
  createdAt: number;
  retries: number;
}

const OUTBOX_KEY = 'vault-sync-outbox';

function normalizeOutboxItem(op: any): SyncOperation | null {
  if (!op || typeof op !== 'object') return null;

  const recordId = typeof op.recordId === 'string' ? op.recordId : null;
  const recordType = (op.recordType as RecordType | undefined) ?? 'bookmark';
  const baseVersion = typeof op.baseVersion === 'number' ? op.baseVersion : 0;
  const ciphertext = typeof op.ciphertext === 'string' ? op.ciphertext : null;
  const deleted = typeof op.deleted === 'boolean' ? op.deleted : false;

  const id = typeof op.id === 'string' ? op.id : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = typeof op.createdAt === 'number' ? op.createdAt : Date.now();
  const retries = typeof op.retries === 'number' ? op.retries : 0;

  if (!recordId || !ciphertext) return null;

  return {
    id,
    recordId,
    recordType,
    baseVersion,
    ciphertext,
    deleted,
    createdAt,
    retries,
  };
}

export function getOutbox(): SyncOperation[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(OUTBOX_KEY);
  if (!data) return [];

  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed.map(normalizeOutboxItem).filter(Boolean) as SyncOperation[];

    if (normalized.length !== parsed.length) {
      saveOutbox(normalized);
    }

    return normalized;
  } catch {
    return [];
  }
}

function saveOutbox(outbox: SyncOperation[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

export function addToOutbox(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retries'>): SyncOperation {
  const outbox = getOutbox();
  const op: SyncOperation = {
    ...operation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    retries: 0,
  };
  outbox.push(op);
  saveOutbox(outbox);
  return op;
}

export function removeFromOutbox(id: string): void {
  const outbox = getOutbox();
  const filtered = outbox.filter((op) => op.id !== id);
  saveOutbox(filtered);
}

export function updateOutboxItem(id: string, updates: Partial<SyncOperation>): void {
  const outbox = getOutbox();
  const index = outbox.findIndex((op) => op.id === id);
  if (index !== -1) {
    outbox[index] = { ...outbox[index], ...updates };
    saveOutbox(outbox);
  }
}

export function clearOutbox(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OUTBOX_KEY);
}

export function getOutboxSize(): number {
  return getOutbox().length;
}
