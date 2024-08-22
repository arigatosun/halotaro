import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DBStaffShift } from '@/sections/Dashboard/reservation/staff-shifts/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (!staffId || !year || !month) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const endDate = `${year}-${month.padStart(2, '0')}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`;

  try {
    const { data, error } = await supabase
      .from('staff_shifts')
      .select('*')
      .eq('staff_id', staffId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching staff shifts:', error);
    return NextResponse.json({ error: 'Failed to fetch staff shifts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
      const shift: Omit<DBStaffShift, 'id'> = await request.json();
  
      // start_time と end_time が空文字列の場合、null に変換
      if (shift.start_time === '') shift.start_time = null;
      if (shift.end_time === '') shift.end_time = null;
  
      const { data, error } = await supabase
        .from('staff_shifts')
        .upsert(shift)
        .select()
        .single();
  
      if (error) throw error;
  
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error upserting staff shift:', error);
      return NextResponse.json({ error: 'Failed to upsert staff shift' }, { status: 500 });
    }
  }

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing shift ID' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('staff_shifts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff shift:', error);
    return NextResponse.json({ error: 'Failed to delete staff shift' }, { status: 500 });
  }
}