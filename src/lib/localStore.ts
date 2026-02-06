import type { UserRecord } from './attendance';

const KEY = 'leave_manager_records_v1';

export async function readRecords(): Promise<UserRecord[]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserRecord[];
    return parsed.map(r => ({ ...r }));
  } catch (e) {
    console.warn('localStore: failed to read records', e);
    return [];
  }
}

export async function upsertRecord(rec: UserRecord): Promise<UserRecord> {
  const existing = await readRecords();
  const isoDate = typeof rec.date === 'string' ? rec.date : new Date(rec.date).toISOString();
  const next = existing.filter(r => r.date !== isoDate);
  const saved: UserRecord = { ...rec, date: isoDate };
  next.push(saved);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('localStore: failed to save record', e);
  }
  return saved;
}

export async function deleteRecord(date: string | Date): Promise<void> {
  const iso = typeof date === 'string' ? date : new Date(date).toISOString();
  const existing = await readRecords();
  const next = existing.filter(r => r.date !== iso);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('localStore: failed to delete record', e);
  }
}

export async function clearAll(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
