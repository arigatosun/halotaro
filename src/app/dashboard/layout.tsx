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
    <div>
      <Header />
      <main
        className={`pt-[calc(var(--main-header-height)+var(--sub-header-height)+2rem)] p-0 overflow-auto`}
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
