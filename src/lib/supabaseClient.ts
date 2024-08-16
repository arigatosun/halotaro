import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // セッションを永続化
    autoRefreshToken: true, // トークンを自動的に更新
    storage: typeof window !== "undefined" ? window.localStorage : undefined, // ストレージの指定
  },
});
