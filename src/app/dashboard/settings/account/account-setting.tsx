"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/authcontext";
import { supabase } from "@/lib/supabaseClient"; // Supabaseクライアント
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

/**
 * アカウント設定ページ全体を表示するコンポーネント
 */
const AccountSettingsPage: React.FC = () => {
  const { user, loading: authLoading, refreshAuthState } = useAuth();
  const [retryCount, setRetryCount] = useState(0);

  // ログインが確定しない場合に再取得をリトライ (任意ロジック)
  useEffect(() => {
    if (!authLoading && !user && retryCount < 3) {
      refreshAuthState();
      setRetryCount((prev) => prev + 1);
    }
  }, [authLoading, user, retryCount, refreshAuthState]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-red-500 text-center mt-4">
        ログイン情報の取得に失敗しました。
        <br />
        再度ログインしてからお試しください。
      </div>
    );
  }

  // ログイン中のユーザーが取得できた場合にアカウント設定フォームを表示
  return (
    <AuthenticatedAccountSettings userId={user.id} userEmail={user.email} />
  );
};

export default AccountSettingsPage;

/**
 * ログインユーザーが確定している状態で表示するアカウント設定フォーム
 */
const AuthenticatedAccountSettings: React.FC<{
  userId: string;
  userEmail?: string;
}> = ({ userId, userEmail }) => {
  const { toast } = useToast();

  // 入力フォーム用のstate
  const [newEmail, setNewEmail] = useState(userEmail ?? "");
  const [newPassword, setNewPassword] = useState("");

  // メール & パスワードをアップデートする関数
  const handleUpdateAccount = async () => {
    try {
      // 変更があるかどうかチェック
      const updatePayload: { email?: string; password?: string } = {};

      // メールアドレスが変更されている場合のみセット
      if (newEmail && newEmail !== userEmail) {
        updatePayload.email = newEmail;
      }

      // パスワードが入力されている場合のみセット
      if (newPassword.trim() !== "") {
        updatePayload.password = newPassword;
      }

      // 変更なしの場合はスキップ
      if (Object.keys(updatePayload).length === 0) {
        toast({
          title: "変更なし",
          description: "メールアドレス・パスワード共に変更がありません。",
        });
        return;
      }

      // Supabase Auth で更新を行う
      const { data, error } = await supabase.auth.updateUser(updatePayload);

      // 失敗したときはトーストでエラーを表示
      if (error) {
        toast({
          title: "エラー",
          description: error.message || "アカウント更新に失敗しました。",
          variant: "destructive",
        });
        return;
      }

      // 成功トースト
      toast({
        title: "アカウント情報を更新しました",
        description: "メールアドレスまたはパスワードが正しく変更されました。",
      });

      // パスワード欄をクリア
      setNewPassword("");

      // メールアドレスを変更した場合は、メール確認などが必要になる可能性があります
      // ここはSupabaseプロジェクトのAuth設定による
    } catch (err: any) {
      console.error("Error updating account info:", err);
      // 失敗トースト
      toast({
        title: "エラー",
        description:
          err?.message ??
          "メールアドレス・パスワード更新中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">アカウント設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="newEmail">メールアドレス</Label>
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="新しいメールアドレス"
            />
            <p className="text-sm text-gray-500 mt-1">
              メールアドレスのみ変更する場合はパスワードを空のままにしてください
            </p>
          </div>

          <div>
            <Label htmlFor="newPassword">パスワード</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード"
            />
            <p className="text-sm text-gray-500 mt-1">
              パスワードのみ変更する場合はメールアドレスをそのままにしてください
            </p>
          </div>

          <Button onClick={handleUpdateAccount}>アカウント情報を更新</Button>
        </CardContent>
      </Card>
    </div>
  );
};
