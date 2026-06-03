import { NextResponse } from 'next/server';
import { addEmployee, deleteEmployee } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { sheetName, id, name } = await request.json();
    if (!sheetName || !id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    await addEmployee(sheetName, id, name);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheetName');
    const id = searchParams.get('id');
    
    if (!sheetName || !id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    await deleteEmployee(sheetName, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
