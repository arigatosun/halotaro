import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const userId = request.headers.get("user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.salonName || !body.phone || !body.address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("salons")
      .upsert(
        {
          id: body.id,
          user_id: userId,
          salon_name: body.salonName,
          phone: body.phone,
          address: body.address,
          website: body.website,
          description: body.description,
          weekday_open: body.weekdayOpen,
          weekday_close: body.weekdayClose,
          weekend_open: body.weekendOpen,
          weekend_close: body.weekendClose,
          closed_days: body.closedDays,
          main_image_url: body.mainImageUrl,
          sub_image_urls: body.subImageUrls,
        },
        {
          onConflict: "id",
        }
      )
      .select();

    if (error) throw error;

    return NextResponse.json({ message: "Salon information updated successfully", data });
  } catch (error) {
    console.error("Error updating salon data:", error);
    return NextResponse.json({ error: "Failed to update salon data" }, { status: 500 });
  }
}
