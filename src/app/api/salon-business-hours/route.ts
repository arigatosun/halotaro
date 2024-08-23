// src/api/salon-business-hours/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (!year || !month) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const endDate = `${year}-${month.padStart(2, '0')}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`;

  try {
    const { data, error } = await supabase
      .from('salon_business_hours')
      .select('date, is_holiday')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching salon business hours:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch salon business hours' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const businessHours = await request.json();

    if (!Array.isArray(businessHours)) {
      return NextResponse.json({ success: false, error: 'Invalid input format' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('salon_business_hours')
      .upsert(businessHours, {
        onConflict: 'salon_id,date'
      });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in salon-business-hours API:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ success: false, error: 'An unknown error occurred' }, { status: 500 });
    }
  }
}