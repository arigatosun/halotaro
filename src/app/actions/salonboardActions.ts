import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { encrypt, decrypt } from "@/utils/encryption";

export async function getSalonboardCredentials(userId: string) {
  const supabase = createServerActionClient({ cookies });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Authentication error:", authError);
    throw new Error("Authentication failed");
  }

  console.log("Authenticated user:", user.id);
  console.log("Requested userId:", userId);

  if (user.id !== userId) {
    throw new Error("User ID mismatch");
  }

  const { data, error } = await supabase
    .from("salonboard_credentials")
    .select("username, encrypted_password")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      console.log("Credentials not found for user:", userId);
      return null; // Credentials not found
    }
    console.error("Error fetching credentials:", error);
    throw new Error(`Failed to fetch credentials: ${error.message}`);
  }

  if (data) {
    console.log("Credentials found for user:", userId);
    return {
      username: data.username,
      password: decrypt(data.encrypted_password),
    };
  }

  return null;
}

export async function saveSalonboardCredentials(
  userId: string,
  username: string,
  password: string
) {
  console.log("saveSalonboardCredentials called with userId:", userId);

  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  try {
    console.log("Attempting to get session");
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      throw new Error(`Authentication failed: ${sessionError.message}`);
    }

    if (!session) {
      console.error("No session data");
      throw new Error("Authentication failed: No session found");
    }

    console.log("Session user:", session.user);

    if (session.user.id !== userId) {
      console.error("User ID mismatch", {
        sessionUserId: session.user.id,
        providedUserId: userId,
      });
      throw new Error("User ID mismatch");
    }

    const encryptedPassword = encrypt(password);

    console.log("Attempting to save credentials to database");
    const { data: savedData, error: saveError } = await supabase
      .from("salonboard_credentials")
      .upsert(
        {
          user_id: userId,
          username,
          encrypted_password: encryptedPassword,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select();

    if (saveError) {
      console.error("Supabase error:", saveError);
      throw new Error(`Failed to save credentials: ${saveError.message}`);
    }

    console.log("Credentials saved successfully");
    return savedData;
  } catch (error) {
    console.error("Detailed error in saveSalonboardCredentials:", error);
    throw error;
  }
}
