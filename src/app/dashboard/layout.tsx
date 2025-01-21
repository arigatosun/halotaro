"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Noto_Sans_JP } from "next/font/google";
import "../globals.css";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ScrollToTopButton from "@/components/layout/scroll-to-top";

import PrivateRoute from "@/components/Auth/PrivateRoute";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Toaster } from "@/components/ui/toaster";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

// カスタムテーマを作成
const theme = createTheme({
  typography: {
    fontFamily: notoSansJP.style.fontFamily,
  },
  // 必要に応じて他のテーマ設定を追加
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isReservationPage = pathname === "/dashboard/reservations";

  return (
    // ★ ここで認証ガードをかける
    <PrivateRoute>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className={`flex flex-col min-h-screen ${notoSansJP.className}`}>
          <Header />

          <main className="flex-grow pt-[calc(var(--main-header-height)+var(--sub-header-height)+1rem)] p-0 overflow-auto mt-3">
            <div
              className={
                isReservationPage ? "w-full h-full" : "max-w-7xl mx-auto"
              }
            >
              {children}
              <Toaster />
            </div>
          </main>

          <ScrollToTopButton />
          <Footer />
        </div>
      </ThemeProvider>
    </PrivateRoute>
  );
}
