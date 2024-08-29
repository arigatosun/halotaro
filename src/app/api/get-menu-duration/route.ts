import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const menuId = searchParams.get('menuId');

  if (!menuId) {
    return NextResponse.json({ error: 'Missing menuId parameter' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('duration')
      .eq('id', menuId)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    return NextResponse.json({ duration: data.duration });
  } catch (error) {
    console.error('Error fetching menu duration:', error);
    return NextResponse.json({ error: 'Failed to fetch menu duration' }, { status: 500 });
  }
}