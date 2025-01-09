import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// 認証チェック関数
async function checkAuth(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error("Authentication error:", error);
    return { error: "User not authenticated", status: 401 };
  }

  return { user };
}

export async function GET(request: Request) {
  const authResult = await checkAuth(request);
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const supabase = createRouteHandlerClient({ cookies });

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("id");

  if (!customerId) {
    return NextResponse.json(
      { error: "Customer ID is required" },
      { status: 400 }
    );
  }

  try {
    // お客様情報の取得
    const { data: customerData, error: customerError } = await supabase
      .from("reservation_customers")
      .select(
        `
          id,
          name,
          name_kana,
          phone,
          email,
          reservation_count,
          cancellation_count,
          customer_details (
            gender,
            birth_date,
            address,
            wedding_anniversary,
            children,
            memo
          ),
          reservations:reservations!fk_customer (
            id,
            start_time,
            end_time,
            status,
            total_price,
            staff:staff!fk_staff ( name ),
            menu_item: menu_items!fk_menu_item (
              id,
              name,
              price,
              category_id,
              categories:categories!fk_category ( id, name )
            ),
            coupon:coupons!fk_coupon_id ( id, name, price, category, description ),
            accounting_information:accounting_information!accounting_information_reservation_fkey (
              items,
              total_price
            )
          )
        `
      )
      .eq("id", customerId)
      .single();

    if (customerError) {
      console.error("Error fetching customer details:", customerError);
      return NextResponse.json(
        { error: customerError.message },
        { status: 500 }
      );
    }

    // 予約データの整形
    let reservations = (customerData.reservations || []).map(
      (reservation: any) => {
        let technicalAmount = 0;
        let productAmount = 0;
        let amount = 0;

        // ステータスのマッピング
        const statusMapping: { [key: string]: string } = {
          confirmed: "受付待ち",
          salon_cancelled: "サロンキャンセル",
          same_day_cancelled: "当日キャンセル",
          no_show: "無断キャンセル",
          cancelled: "お客様キャンセル",
          paid: "会計済み",
        };
        const mappedStatus = statusMapping[reservation.status] || "不明";

        if (reservation.accounting_information) {
          // accounting_informationがある場合
          amount = reservation.accounting_information.total_price || 0;

          if (Array.isArray(reservation.accounting_information.items)) {
            const accountingItems = reservation.accounting_information.items;
            accountingItems.forEach((item: any) => {
              const category = item.category; // '施術' or '店販'
              const price = item.price || 0;

              if (category === "施術") {
                technicalAmount += price;
              } else if (category === "店販") {
                productAmount += price;
              }
            });
          }
        } else {
          // accounting_informationがない場合は、menu_itemとcouponの両方を確認する
          let itemPrice = 0;
          let itemCategory = "施術";

          // menu_itemがある場合
          if (reservation.menu_item) {
            const miPrice = reservation.menu_item.price || 0;
            const miCategory = reservation.menu_item.category || "施術";
            amount += miPrice;
            if (miCategory === "施術") {
              technicalAmount += miPrice;
            } else if (miCategory === "店販") {
              productAmount += miPrice;
            }
          }

          // couponがある場合
          if (reservation.coupon) {
            const cPrice = reservation.coupon.price || 0;
            const cCategory = reservation.coupon.category || "施術";
            amount += cPrice;
            if (cCategory === "施術") {
              technicalAmount += cPrice;
            } else if (cCategory === "店販") {
              productAmount += cPrice;
            }
          }
        }

        return {
          date: reservation.start_time
            ? new Date(reservation.start_time).toLocaleDateString()
            : "",
          staff: reservation.staff?.name || "未指定",
          status: mappedStatus,
          menu:
            reservation.menu_item?.name || reservation.coupon?.name || "未指定",
          amount: amount,
          technicalAmount: technicalAmount,
          productAmount: productAmount,
        };
      }
    );

    // 予約を来店日の降順（新しい順）にソート
    reservations.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    // キャンセルされた予約の抽出
    const cancelledReservations = reservations.filter((r: any) =>
      [
        "お客様キャンセル",
        "サロンキャンセル",
        "当日キャンセル",
        "無断キャンセル",
      ].includes(r.status)
    );

    // 最終キャンセル日の計算
    const lastCancelDate =
      cancelledReservations.length > 0
        ? new Date(
            Math.max(
              ...cancelledReservations.map((r: any) =>
                new Date(r.date).getTime()
              )
            )
          ).toLocaleDateString()
        : "なし";

    // 詳細情報の取得（配列の最初の要素を取得）
    const detailInfo = customerData.customer_details?.[0] || {};

    // お客様情報の設定
    const customerDetails = {
      id: customerData.id,
      name: customerData.name,
      kana: customerData.name_kana || "",
      phone: customerData.phone,
      email: customerData.email,
      visits: customerData.reservation_count || 0,
      cancelCount: customerData.cancellation_count || 0,
      // 追加: 詳細情報
      detailInfo: {
        gender: detailInfo.gender || "",
        birthDate: detailInfo.birth_date || "",
        address: detailInfo.address || "",
        weddingAnniversary: detailInfo.wedding_anniversary || "",
        children: detailInfo.children || [],
        memo: detailInfo.memo || "",
      },
      reservations: reservations, // 予約データ
      lastCancelDate: lastCancelDate,
    };

    return NextResponse.json({ customerDetails });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
