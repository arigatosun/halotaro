// supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// モジュール読み込み時に一度だけcreateClientを呼び出し、同じインスタンスを共有
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
