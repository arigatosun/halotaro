import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from "antd";

// AuthProvider を「クライアントコンポーネント」としてインポート
// (AuthProvider内部では "use client" が宣言されているはず)
import { AuthProvider } from "@/lib/authContext";

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={notoSansJP.className}>
        <ConfigProvider>
          {/* 
            layout.tsx はサーバーコンポーネントだが、
            クライアントコンポーネントである AuthProvider を
            直接ネストしても問題ありません 
          */}
          <AuthProvider>{children}</AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
