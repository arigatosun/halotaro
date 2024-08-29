import { NextRequest, NextResponse } from "next/server";
import { runSalonboardIntegration } from "../../../../scripts/main";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const result = await runSalonboardIntegration(username, password);
    return NextResponse.json({ message: result });
  } catch (error) {
    console.error("Integration error:", error);
    return NextResponse.json({ error: "Integration failed" }, { status: 500 });
  }
}
