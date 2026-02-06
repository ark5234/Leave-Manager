import { NextResponse } from 'next/server';
import { readRecords, upsertRecord, deleteRecord } from '@/lib/storage';

export async function GET() {
  try {
    const records = await readRecords();
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: { date: string; status: string; note?: string } = await request.json();
    const { date, status, note } = body;

    if (status === 'DELETE') {
      await deleteRecord(date);
      return NextResponse.json({ date, status: null });
    }

    const record = await upsertRecord({ date, status, note });
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: 'Failed to save record' }, { status: 500 });
  }
}
