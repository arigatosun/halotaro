"use client";
import React from "react";
import { usePathname } from "next/navigation";
import "../globals.css";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ScrollToTopButton from "@/components/layout/scroll-to-top";
import PrivateRoute from "@/components/Auth/PrivateRoute";
import { AuthProvider } from "@/contexts/authcontext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isReservationPage = pathname === "/dashboard/reservations";

  return (
    <PrivateRoute>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow pt-[calc(var(--main-header-height)+var(--sub-header-height)+2rem)] p-0 overflow-auto">
            <div
              className={
                isReservationPage ? "w-full h-full" : "max-w-7xl mx-auto"
              }
            >
              {children}
            </div>
          </main>
          <ScrollToTopButton />
          <Footer />
        </div>
      </AuthProvider>
    </PrivateRoute>
  );
}
