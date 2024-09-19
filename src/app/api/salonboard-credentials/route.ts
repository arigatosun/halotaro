import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { encrypt, decrypt } from "../../../utils/encryption";

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("salonboard_credentials")
      .select("username, encrypted_password, last_used")
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Credentials not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    if (data) {
      const decryptedPassword = decrypt(data.encrypted_password);

      // Update last_used
      await supabase
        .from("salonboard_credentials")
        .update({ last_used: new Date().toISOString() })
        .eq("user_id", user.id);

      return NextResponse.json({ ...data, password: decryptedPassword });
    } else {
      return NextResponse.json(
        { error: "Credentials not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json(
      { error: "Error fetching credentials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const encryptedPassword = encrypt(password);

    const { error } = await supabase.from("salonboard_credentials").insert({
      user_id: user.id,
      username,
      encrypted_password: encryptedPassword,
    });

    if (error) throw error;

    return NextResponse.json({ message: "Credentials saved successfully" });
  } catch (error) {
    console.error("Error saving credentials:", error);
    return NextResponse.json(
      { error: "Error saving credentials" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const encryptedPassword = encrypt(password);

    const { error } = await supabase
      .from("salonboard_credentials")
      .update({
        username,
        encrypted_password: encryptedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ message: "Credentials updated successfully" });
  } catch (error) {
    console.error("Error updating credentials:", error);
    return NextResponse.json(
      { error: "Error updating credentials" },
      { status: 500 }
    );
  }
}
