"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext"; // 同じ Context に統一

export default function PrivateRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hook1
  const router = useRouter();
  // Hook2
  const { user, loading } = useAuth();

  // Hook3 - 常に呼び出す (トップレベル)
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [loading, user, router]);

  // ここで条件分岐する (でも Hook は呼ばない)
  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (!user) {
    // user がいない場合は何も描画しない (上の useEffect で遷移)
    return null;
  }

  // ログイン済みなら子要素を描画
  return <>{children}</>;
}
