"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/authcontext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

/**
 * アカウント設定ページ全体を表示するコンポーネント
 */
export default function AccountSettingView() {
  const { user, loading: authLoading, refreshAuthState } = useAuth();
  const [retryCount, setRetryCount] = useState(0);

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
    <AuthenticatedAccountSettings
      userId={user.id}
      userEmail={user.email ?? ""}
    />
  );
}

function AuthenticatedAccountSettings({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const { toast } = useToast();

  const [newEmail, setNewEmail] = useState(userEmail);
  const [newPassword, setNewPassword] = useState("");

  async function handleUpdateAccount() {
    try {
      const updatePayload: { email?: string; password?: string } = {};

      if (newEmail && newEmail !== userEmail) {
        updatePayload.email = newEmail;
      }
      if (newPassword.trim() !== "") {
        updatePayload.password = newPassword;
      }

      if (Object.keys(updatePayload).length === 0) {
        toast({
          title: "変更なし",
          description: "メールアドレス・パスワード共に変更がありません。",
        });
        return;
      }

      const { data, error } = await supabase.auth.updateUser(updatePayload);

      if (error) {
        toast({
          title: "エラー",
          description: error.message || "アカウント更新に失敗しました。",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "アカウント情報を更新しました",
        description: "メールアドレスまたはパスワードが正しく変更されました。",
      });

      setNewPassword("");
    } catch (err: any) {
      toast({
        title: "エラー",
        description:
          err?.message ??
          "メールアドレス・パスワード更新中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  }

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
          </div>

          <Button onClick={handleUpdateAccount}>アカウント情報を更新</Button>
        </CardContent>
      </Card>
    </div>
  );
}
