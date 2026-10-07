import { STORAGE_PREFIX, TABLE_NAMES, SEED_TIMESTAMP, type TableName } from "../constants/storageKeys";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import type { StampedRow } from "../types/FieldChange";

const memoryFallback = new Map<string, string>();

function backend(): Storage | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // Sandboxed iframes can throw on access; fall back to memory.
  }
  return null;
}

export function readJson<T>(key: string): T | null {
  const store = backend();
  const raw = store ? store.getItem(key) : (memoryFallback.get(key) ?? null);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  const store = backend();
  try {
    if (store) store.setItem(key, raw);
    else memoryFallback.set(key, raw);
  } catch {
    throw new Error(ERROR_MESSAGES.MERGE_STORAGE_FULL);
  }
}

export function removeKey(key: string): void {
  const store = backend();
  if (store) store.removeItem(key);
  memoryFallback.delete(key);
}

const tableKey = (table: TableName) => `${STORAGE_PREFIX}${table}`;

export function readTable<T>(table: TableName): T[] {
  return readJson<T[]>(tableKey(table)) ?? [];
}

export function writeTable<T>(table: TableName, rows: T[]): void {
  writeJson(tableKey(table), rows);
}

export function resetTable(table: TableName): void {
  removeKey(tableKey(table));
}

export function resetAllTables(): void {
  (Object.values(TABLE_NAMES) as TableName[]).forEach(resetTable);
}

export function ensureTableSeeded<T extends object>(
  table: TableName,
  seedRows: readonly T[],
  stampTime: string = SEED_TIMESTAMP
): void {
  if (readJson(tableKey(table)) !== null) return;
  const stamped: StampedRow<T>[] = seedRows.map((row) => ({
    data: row,
    field_timestamps: Object.fromEntries(Object.keys(row).map((field) => [field, stampTime]))
  }));
  writeTable(table, stamped);
}
