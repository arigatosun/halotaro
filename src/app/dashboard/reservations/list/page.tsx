import dynamic from "next/dynamic";
import { Suspense } from "react";

// クライアントサイドでのみレンダリングされるようにダイナミックインポートを使用
const ReservationListView = dynamic(
  () => import("@/sections/Dashboard/reservation/list/reservation-list-view"),
  { ssr: false }
);

export default function ReservationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReservationListView />
    </Suspense>
  );
}