"use client";

import { useParams } from "next/navigation";
import ReservationRoot from "@/sections/reservation-user/ReservationRoot";

export default function ReservationPage() {
  const params = useParams();
  const userId = params["user-id"] as string;

  if (!userId) {
    return <div>User ID is not provided</div>;
  }

  return <ReservationRoot userId={userId} />;
}
