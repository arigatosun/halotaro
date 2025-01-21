"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/authcontext";

export default function PrivateRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  // ローディング中はスピナーやメッセージを出す
  if (loading) {
    return <div>読み込み中...</div>;
  }

  // ローディング完了後、未ログインならログイン画面へ
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [loading, user, router]);

  if (!user) {
    // user がいない場合は何も描画しない (上の useEffect で遷移)
    return null;
  }

  // ログイン済みなら子要素を描画
  return <>{children}</>;
}
