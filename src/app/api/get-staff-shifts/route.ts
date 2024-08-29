import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!staffId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

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