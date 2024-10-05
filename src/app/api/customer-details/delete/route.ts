// app/api/customer-details/delete/route.ts

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// 認証チェック関数
async function checkAuth(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('Authentication error:', error);
    return { error: 'User not authenticated', status: 401 };
  }

  return { user };
}

export async function DELETE(request: Request) {
  // 認証チェック
  const authResult = await checkAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const supabase = createRouteHandlerClient({ cookies });

  const url = new URL(request.url);
  const customerId = url.searchParams.get('id');

  if (!customerId) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('customer_details')
      .delete()
      .eq('customer_id', customerId);

    if (error) {
      console.error('Delete Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
