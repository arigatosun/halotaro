import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');
  
      if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
      }
  
      const { data, error } = await supabase
        .from('staff_notification_emails')
        .select('email_addresses')
        .eq('user_id', userId)
        .single();
  
      if (error) {
        // PGRST116エラー（レコードが見つからない）の場合は空の配列を返す
        if (error.code === 'PGRST116') {
          return NextResponse.json({ emailAddresses: [] });
        }
        console.error('Error fetching staff notification emails:', error);
        return NextResponse.json({ error: "Failed to fetch staff emails" }, { status: 500 });
      }
  
      return NextResponse.json({ emailAddresses: data?.email_addresses || [] });
    } catch (error) {
      console.error('Unexpected error:', error);
      return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }
  }

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, emailAddresses } = body;

    if (!userId || !Array.isArray(emailAddresses)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { error } = await supabase
      .from('staff_notification_emails')
      .upsert({ user_id: userId, email_addresses: emailAddresses }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving staff notification emails:', error);
      return NextResponse.json({ error: "Failed to save staff emails" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}