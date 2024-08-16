import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function getUserStripeAccountId(
  userId: string
): Promise<string | null> {
  const supabase = createServerComponentClient({ cookies });

  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("stripe_account_id")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user stripe account id:", error);
      return null;
    }

    return data?.stripe_account_id || null;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}
