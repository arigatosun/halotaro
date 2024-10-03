"use client";

import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const formSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "パスワードは8文字以上である必要があります" })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message:
          "パスワードは少なくとも1つの大文字、小文字、数字を含む必要があります",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function SetPasswordPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

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

  async function onSubmit(values: FormValues) {
    if (!user) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      alert(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/auth/signup/subscription`);
      }, 2000);
    }
    setLoading(false);
  }

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">
                パスワードの設定
              </CardTitle>
              <CardDescription>
                安全なパスワードを設定してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">パスワードの確認</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-red-600 text-white hover:bg-red-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      パスワードを設定中...
                    </>
                  ) : (
                    "パスワードを設定"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Alert variant="default" className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  パスワードが正常に設定されました。次の画面に移動します...
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