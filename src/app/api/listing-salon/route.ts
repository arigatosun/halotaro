import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("user-id");
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("salons")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      // サロン情報が存在する場合
      return NextResponse.json(data);
    } else {
      // サロン情報が存在しない場合
      return NextResponse.json(
        { message: "Salon not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error fetching salon data:", error);
    return NextResponse.json(
      { message: "Failed to fetch salon data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("user-id");
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // サロン情報が既に存在するか確認
    const { data: existingSalon, error: fetchError } = await supabase
      .from("salons")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let responseData;

    if (existingSalon) {
      // サロン情報が存在する場合は更新
      const { data, error } = await supabase
        .from("salons")
        .update({
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
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      responseData = data;
    } else {
      // サロン情報が存在しない場合は新規作成
      const { data, error } = await supabase
        .from("salons")
        .insert({
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
        })
        .select()
        .single();

      if (error) throw error;

      responseData = data;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error saving salon data:", error);
    return NextResponse.json(
      { message: "Failed to save salon data" },
      { status: 500 }
    );
  }
}
