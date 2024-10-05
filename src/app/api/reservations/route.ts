// api/reservations/[id]/route.ts
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const supabase = createServerComponentClient({ cookies });

  // リレーションシップを明示的に指定
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      reservation_customers!fk_customer (name, email, phone, name_kana, reservation_count, cancellation_count),
      staff (name),
      menu_items (name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
