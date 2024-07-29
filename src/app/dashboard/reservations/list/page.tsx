import dynamic from "next/dynamic";
import { Suspense } from "react";

// クライアントサイドでのみレンダリングされるようにダイナミックインポートを使用
const ReservationListPage = dynamic(
  () => import("@/sections/Dashboard/reservation/list/reservation-list-view"),
  { ssr: false }
);

export default function ReservationList() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReservationListPage />
    </Suspense>
  );
}
