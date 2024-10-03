"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import Link from "next/link";

export default function SuccessPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      const myConfetti = confetti.create(undefined, {
        resize: true,
        useWorker: true,
      });

      myConfetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      const timer = setInterval(() => {
        setCountdown((prevCount) => prevCount - 1);
      }, 1000);

      const redirect = setTimeout(() => {
        router.push("/auth/login");
      }, 5000);

      return () => {
        clearInterval(timer);
        clearTimeout(redirect);
        myConfetti.reset();
      };
    }
  }, [user, router]);

  if (loading || !user) {
    return (
      <div className="container mx-auto py-10 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
      <div className="container mx-auto py-10 flex-grow flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-red-200 shadow-lg">
            <CardHeader className="bg-red-100 rounded-t-lg">
              <CardTitle className="text-3xl font-bold text-center text-red-800 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 mr-2 text-red-500" />
                登録完了！
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-center text-gray-600 mb-6">
                ご登録ありがとうございます。アカウントが正常に作成されました。
              </p>
              <p className="text-center text-gray-600 font-semibold">
                {countdown}秒後にログインページにリダイレクトされます...
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button
                onClick={() => router.push("/auth/login")}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200"
              >
                今すぐログインページへ
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
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