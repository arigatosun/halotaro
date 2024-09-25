"use client"
import React from "react";
import ReservationCalendar from "@/components/ReservationCalendar";

const ReservationView: React.FC = () => {
  return (
    <div className="p-4">
      <ReservationCalendar />
    </div>
  );
};

export default ReservationView;