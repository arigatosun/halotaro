"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const formSchema = z.object({
  email: z
    .string()
    .email({ message: "メールアドレスが無効です" })
    .nonempty("メールアドレスは必須です"),
});

type FormValues = z.infer<typeof formSchema>;

export default function SignUpPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: `http://localhost:3000/auth/signup/set-password`,
      },
    });

    if (error) {
      alert(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
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
      <div className="container mx-auto py-16 px-4 sm:px-6 lg:px-8 flex-grow flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">アカウント作成</CardTitle>
              <CardDescription>
                {plan
                  ? `選択されたプラン: ${plan}`
                  : "メールアドレスを入力してください"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-red-600 text-white hover:bg-red-700"
                  disabled={loading}
                >
                  {loading ? "送信中..." : "認証メールを送信"}
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-gray-500">
                すでにアカウントをお持ちですか？{" "}
                <Link href="/login" className="text-red-600 hover:underline">
                  ログイン
                </Link>
              </p>
            </CardFooter>
          </Card>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Alert variant="default" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>メールを確認してください</AlertTitle>
                <AlertDescription>
                  認証リンクを記載したメールを送信しました。メールを確認し、リンクをクリックして登録を完了してください。
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
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