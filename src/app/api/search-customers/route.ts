import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// ひらがなをカタカナに変換する関数
function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, function(match) {
    return String.fromCharCode(match.charCodeAt(0) + 0x60);
  });
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { query } = await request.json();
    console.log("Original search query:", query);

    // 検索クエリをカタカナに変換
    const katakanaQuery = hiraganaToKatakana(query);
    console.log("Converted to katakana:", katakanaQuery);

    // 両方の文字種で検索
    const searchTerms = [
      `%${query}%`,      // 元の検索語
      `%${katakanaQuery}%`  // カタカナ変換した検索語
    ];

    // 修正: 複数の検索条件を設定
    const { data: customers, error } = await supabase
      .from("reservation_customers")
      .select("id, name, name_kana, email, phone")
      .eq("user_id", user.id)
      .or(searchTerms.map(term => `name.ilike.${term},name_kana.ilike.${term}`).join(','));

    console.log("Query execution:", {
      originalTerm: query,
      katakanaTerm: katakanaQuery,
      matchedCount: customers?.length || 0
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "顧客情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (customers && customers.length > 0) {
      console.log("Found matches:", customers.map(c => ({
        name: c.name,
        name_kana: c.name_kana,
        matchedQuery: query
      })));
    } else {
      console.log("No matches found for queries:", { original: query, katakana: katakanaQuery });
    }

    return NextResponse.json(customers || []);
  } catch (error) {
    console.error("Unexpected error in search-customers:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}