import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name')
      .eq('is_published', true);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching staffs:', error);
    return NextResponse.json({ error: 'Failed to fetch staffs' }, { status: 500 });
  }
}