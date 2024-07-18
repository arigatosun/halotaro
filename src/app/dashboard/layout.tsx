"use client";
import React from "react";
import { usePathname } from "next/navigation";
import "../globals.css";
import Header from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isReservationPage = pathname === "/dashboard/reservations";

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-red-50">
      <Header />
      <main
        className={`flex-1 ${
          isReservationPage ? "p-0" : "p-4 sm:p-8"
        } overflow-auto`}
      >
        <div
          className={isReservationPage ? "w-full h-full" : "max-w-7xl mx-auto"}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
