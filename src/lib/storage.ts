import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const DATA_FILE = path.join(DATA_DIR, 'records.json');

type Record = {
  id?: string;
  date: string;
  status: string;
  note?: string;
};

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify([]));
    }
  } catch (e) {
    // ignore
  }
}

export async function readRecords(): Promise<Record[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

export async function upsertRecord(rec: Record): Promise<Record> {
  const records = await readRecords();
  const idx = records.findIndex(r => r.date === rec.date);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...rec };
    await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2));
    return records[idx];
  }
  const newRec = { ...rec };
  records.push(newRec);
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2));
  return newRec;
}

export async function deleteRecord(date: string): Promise<void> {
  const records = await readRecords();
  const filtered = records.filter(r => r.date !== date);
  await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2));
}

export default { readRecords, upsertRecord, deleteRecord };
