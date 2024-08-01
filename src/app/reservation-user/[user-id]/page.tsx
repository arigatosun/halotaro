"use client";

import ReservationRoot from "@/sections/reservation-user/ReservationRoot";
import { useParams } from "next/navigation";

export default function ReservationUserPage() {
  const params = useParams();
  const userId = params.id as string;

  return <ReservationRoot userId={userId} />;
}
