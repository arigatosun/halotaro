// src/api/salon-business-hours/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    
    // エラーオブジェクトの型をチェックして適切に処理
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ success: false, error: 'An unknown error occurred' }, { status: 500 });
    }
  }
}