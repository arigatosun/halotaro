"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle, Users, Calendar, DollarSign, CreditCard } from "lucide-react";
import Link from "next/link";

export default function SubscriptionPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        router.push("/signup");
      }
    };
    getUser();
  }, [supabase, router]);

  const handleSubscribe = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // ユーザーIDを取得
      const userId = user.id;

      // Payment Linkにclient_reference_idを付加
      const paymentLink = `${process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}?client_reference_id=${userId}`;

      router.push(paymentLink || "/error");
    } catch (error) {
      console.error("Error:", error);
      alert("エラーが発生しました。もう一度お試しください。");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 to-red-50">
      {/* ヘッダー */}
      <header className="bg-white bg-opacity-90 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-red-600">ハロタロ</h1>
          <nav className="flex items-center">
            <ul className="flex space-x-6 mr-6">
              <li>
                <a href="#features" className="text-gray-700 hover:text-yellow-500 transition duration-300">
                  機能
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-gray-700 hover:text-yellow-500 transition duration-300">
                  料金
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-700 hover:text-yellow-500 transition duration-300">
                  お問い合わせ
                </a>
              </li>
            </ul>
            <Link
              href="/auth/login"
              className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-600 transition duration-300"
            >
              ログイン
            </Link>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 flex-grow flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">プレミアムプラン</CardTitle>
            <CardDescription className="text-center text-2xl font-semibold">¥10,000/月</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 mr-2 text-red-500" />
              <p>簡単予約管理</p>
            </div>
            <div className="flex items-center">
              <Users className="w-6 h-6 mr-2 text-red-500" />
              <p>スタッフ管理</p>
            </div>
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 mr-2 text-red-500" />
              <p>売上分析</p>
            </div>
            <div className="flex items-center">
              <CreditCard className="w-6 h-6 mr-2 text-red-500" />
              <p>事前決済機能</p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              ※ 2週間の無料トライアル期間後に課金が開始されます。
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSubscribe}
              className="w-full bg-red-600 text-white hover:bg-red-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                "サブスクリプションを開始する"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* フッター */}
      <footer className="bg-gray-800 text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="mb-4 md:mb-0">&copy; 2024 ハロタロ. All rights reserved.</p>
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <a href="#" className="hover:text-yellow-400 transition duration-300">
                    利用規約
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-yellow-400 transition duration-300">
                    プライバシーポリシー
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-yellow-400 transition duration-300">
                    お問い合わせ
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}