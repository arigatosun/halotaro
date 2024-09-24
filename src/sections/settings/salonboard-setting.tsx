"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Lock, Shield } from "lucide-react";
import { useAuth } from "@/contexts/authcontext";

const SalonBoardIntegrationView: React.FC = () => {
  const [isIntegrationEnabled, setIsIntegrationEnabled] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { user, loading: authLoading, refreshAuthState } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const [savedCredentials, setSavedCredentials] = useState<{
    username: string;
    lastUpdated: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user && retryCount < 3) {
      refreshAuthState();
      setRetryCount((prev) => prev + 1);
    }
  }, [user, authLoading, refreshAuthState, retryCount]);

  useEffect(() => {
    if (user) {
      fetchSavedCredentials();
    }
  }, [user]);

  const fetchSavedCredentials = async () => {
    try {
      const response = await fetch(
        `/api/salonboard-get-credentials?userId=${user!.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setSavedCredentials(data);
        setUsername(data.username || "");
        setIsIntegrationEnabled(!!data.username);
      }
    } catch (error) {
      console.error("Failed to fetch saved credentials:", error);
    }
  };

  if (authLoading) {
    return <div>認証状態を確認中...</div>;
  }

  if (!user) {
    return <div>認証に失敗しました。ページをリロードしてください。</div>;
  }

  const handleIntegrationToggle = () => {
    setIsIntegrationEnabled(!isIntegrationEnabled);
  };

  const handleSaveCredentials = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/salonboard-save-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, userId: user.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to save credentials");
      }

      const data = await response.json();
      setResult(data.message);
      fetchSavedCredentials(); // 保存後に最新の情報を取得
    } catch (error) {
      setResult(
        "ログイン情報の保存中にエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncReservationToSalonboard = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-sync-reservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Reservation sync to Salonboard failed"
        );
      }

      const data = await response.json();
      setResult(data.message);
    } catch (error) {
      setResult(
        "サロンボードへの予約同期中にエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // handleSync 関数を更新して、スタッフ同期にも対応
  const handleSync = async (
    type: "reservations" | "menus" | "staff" | "coupons"
  ) => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/salonboard-integration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ haloTaroUserId: user.id, syncType: type }),
      });

      if (!response.ok) {
        throw new Error(`${type} sync failed`);
      }

      const data = await response.json();
      setResult(JSON.stringify(data.message));
    } catch (error) {
      setResult(
        `${type}の連携中にエラーが発生しました。もう一度お試しください。`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncReservations = () => handleSync("reservations");
  const handleSyncMenus = () => handleSync("menus");
  const handleSyncStaff = () => handleSync("staff");
  const handleSyncCoupons = () => handleSync("coupons"); // 新しい関数を追加

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">サロンボード連携設定</h2>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">サロンボード連携</CardTitle>
          <CardDescription>
            サロンボードと連携することで、予約情報を自動的に同期できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isIntegrationEnabled}
              onCheckedChange={handleIntegrationToggle}
              id="integration-toggle"
            />
            <Label htmlFor="integration-toggle">連携する</Label>
          </div>

          {savedCredentials && (
            <Alert>
              <AlertTitle>保存済みのログイン情報</AlertTitle>
              <AlertDescription>
                ユーザー名: {savedCredentials.username}
                <br />
                最終更新日時:{" "}
                {new Date(savedCredentials.lastUpdated).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}

          {isIntegrationEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">サロンボードユーザー名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ユーザー名を入力"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">サロンボードパスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
                />
              </div>
              <div className="flex space-x-4">
                <Button
                  onClick={handleSaveCredentials}
                  disabled={isLoading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  {isLoading ? "保存中..." : "ログイン情報を保存"}
                </Button>
                <div className="flex space-x-4">
                  <Button
                    onClick={handleSyncReservations}
                    disabled={isLoading || !savedCredentials}
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    {isLoading ? "実行中..." : "予約を同期"}
                  </Button>
                  <Button
                    onClick={handleSyncMenus}
                    disabled={isLoading || !savedCredentials}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    {isLoading ? "実行中..." : "メニューを同期"}
                  </Button>
                  <Button
                    onClick={handleSyncStaff}
                    disabled={isLoading || !savedCredentials}
                    className="flex-1 bg-purple-500 hover:bg-purple-600"
                  >
                    {isLoading ? "実行中..." : "スタッフを同期"}
                  </Button>
                  <Button
                    onClick={handleSyncCoupons}
                    disabled={isLoading || !savedCredentials}
                    className="flex-1 bg-pink-500 hover:bg-pink-600"
                  >
                    {isLoading ? "実行中..." : "クーポンを同期"}
                  </Button>
                </div>
              </div>
            </>
          )}

          {result && (
            <Alert className="mt-4">
              <AlertTitle>実行結果</AlertTitle>
              <AlertDescription>{result}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Alert className="mb-6">
        <Shield className="h-4 w-4" />
        <AlertTitle>セキュリティ保証</AlertTitle>
        <AlertDescription>
          入力されたログイン情報は強力な暗号化技術で保護され、ハロタロのスタッフが直接アクセスすることはありません。
          サロンボードとの安全な連携にのみ使用されます。
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">セキュリティ情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-2">
            <Lock className="h-5 w-5 mt-0.5 text-green-600" />
            <p className="text-sm">
              ログイン情報は256ビットAES暗号化で保護されています。
              これは銀行レベルのセキュリティ基準です。
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 mt-0.5 text-blue-600" />
            <p className="text-sm">
              連携処理はすべて自動化されており、人間のオペレーターが
              ログイン情報にアクセスすることはありません。
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <Shield className="h-5 w-5 mt-0.5 text-purple-600" />
            <p className="text-sm">
              定期的なセキュリティ監査を実施し、お客様の情報を
              最高レベルで保護することをお約束します。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalonBoardIntegrationView;
