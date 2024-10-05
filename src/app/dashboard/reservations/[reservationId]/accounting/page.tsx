import AccountingPage from "@/sections/Dashboard/reservation/reservationId/accounting-view";
import React from "react";

interface PageProps {
  params: {
    reservationId: string;
  };
}

export default function ReservationAccountingPage({ params }: PageProps) {
  return <AccountingPage reservationId={params.reservationId} />;
}