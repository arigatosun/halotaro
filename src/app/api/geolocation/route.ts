import { NextRequest, NextResponse } from "next/server";
import { geolocation } from "@vercel/edge";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { city, country, region } = geolocation(request);

  const response = {
    city: city || "Unknown City",
    region: region || "Unknown Region",
    country: country || "Unknown Country",
  };

  return NextResponse.json(response);
}
