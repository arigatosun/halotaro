// app/api/sentry-debug/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("http://localhost:8000/sentry-debug", {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return NextResponse.json({
      message: "Sentry debug endpoint called successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to call Sentry debug endpoint" },
      { status: 500 }
    );
  }
}
