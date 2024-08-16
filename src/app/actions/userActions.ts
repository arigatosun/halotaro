import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getUserById(userId: string) {
  try {
    // 特定のユーザーIDでフィルタリング
    const { data, error } = await supabase
      .from("stripe_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      if (error.code === "PGRST116") {
        console.log("No data found for user ID:", userId);
        return null;
      }
      throw new Error(`Failed to fetch user data: ${error.message}`);
    }

    return data;
  } catch (err) {
    console.error("Error in getUserById:", err);
    throw err;
  }
}
