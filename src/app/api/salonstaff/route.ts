// app/api/salonstaff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch all staff for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("user-id");
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Add a new staff member
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get("user_id") as string;

    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const name = formData.get("name") as string;
    const role = formData.get("role") as string;
    const experience = formData.get("experience") as string;
    const description = formData.get("description") as string;
    const is_published = formData.get("is_published") === "true";
    const image = formData.get("image") as File;
    const schedule_order = parseInt(formData.get("schedule_order") as string, 10);

    // バリデーション: 必須フィールドが存在するか確認
    if (!name || !role) {
      return NextResponse.json(
        { message: "Name and Role are required." },
        { status: 400 }
      );
    }

    // スケジュール表示順のバリデーション
    if (
      isNaN(schedule_order) ||
      schedule_order < 1 ||
      schedule_order > 20
    ) {
      return NextResponse.json(
        { message: "Schedule order must be between 1 and 20." },
        { status: 400 }
      );
    }

    let imageUrl = null;
    if (image && image.size > 0) {
      const fileExt = image.name.split(".").pop();
      const fileName = `staff-images/${uuidv4()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("staff-images")
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("staff-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("staff")
      .insert({
        user_id: userId,
        name,
        role,
        experience,
        description,
        is_published,
        image: imageUrl,
        schedule_order, // 新しく追加したフィールド
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding staff:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Update an existing staff member
export async function PATCH(request: NextRequest) {
  try {
    const formData = await request.formData();
    const staffId = formData.get("id") as string;

    console.log("Received PATCH request with staffId:", staffId);

    if (!staffId) {
      return NextResponse.json(
        { message: "Invalid staff ID" },
        { status: 400 }
      );
    }

    const updateData: any = {};

    const name = formData.get("name");
    if (name !== null) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { message: "Name is required." },
          { status: 400 }
        );
      }
      updateData.name = name;
    }

    const role = formData.get("role");
    if (role !== null) {
      if (typeof role !== "string" || role.trim() === "") {
        return NextResponse.json(
          { message: "Role is required." },
          { status: 400 }
        );
      }
      updateData.role = role;
    }

    const experience = formData.get("experience");
    if (experience !== null) {
      updateData.experience = experience;
    }

    const description = formData.get("description");
    if (description !== null) {
      updateData.description = description;
    }

    const is_published = formData.get("is_published");
    if (is_published !== null) {
      updateData.is_published = is_published === "true";
    }

    const schedule_order = formData.get("schedule_order");
    if (schedule_order !== null) {
      const orderNumber = parseInt(schedule_order as string, 10);
      if (
        isNaN(orderNumber) ||
        orderNumber < 1 ||
        orderNumber > 20
      ) {
        return NextResponse.json(
          { message: "Schedule order must be between 1 and 20." },
          { status: 400 }
        );
      }
      updateData.schedule_order = orderNumber;
    }

    const image = formData.get("image") as File;
    if (image && image.size > 0) {
      const fileExt = image.name.split(".").pop();
      const fileName = `staff-images/${uuidv4()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("staff-images")
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("staff-images")
        .getPublicUrl(fileName);

      updateData.image = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("staff")
      .update(updateData)
      .eq("id", staffId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a staff member
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("id");

    if (!staffId) {
      return NextResponse.json(
        { message: "Invalid staff ID" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("staff")
      .delete()
      .eq("id", staffId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting staff:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
