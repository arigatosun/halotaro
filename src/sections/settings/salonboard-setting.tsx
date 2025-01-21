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
import { Info, Loader2, Lock, Shield } from "lucide-react";
import { useAuth } from "@/lib/authContext";

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

  // 同期状態を管理するための新しいステート
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [pollingIntervalId, setPollingIntervalId] =
    useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authLoading && !user && retryCount < 3) {
      refreshAuthState();
      setRetryCount((prev) => prev + 1);
    }
  }, [user, authLoading, refreshAuthState, retryCount]);

  useEffect(() => {
    if (user) {
      fetchSavedCredentials();
      // 追加: コンポーネントのマウント時に同期状態をチェック
      checkInitialSyncStatus();
    }
    // クリーンアップ: コンポーネントのアンマウント時にポーリングを停止
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
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

  // 追加: 初期同期状態をチェックする関数
  const checkInitialSyncStatus = async () => {
    try {
      const response = await fetch(
        `/api/salonboard-sync-status?userId=${user!.id}`
      );
      const data = await response.json();

      if (data.status === "in_progress") {
        setIsLoading(true);
        setSyncStatus("in_progress");
        setResult("同期を再開しています...");
        // ポーリングを再開
        const intervalId = setInterval(checkSyncStatus, 5000); // 5秒ごとにチェック
        setPollingIntervalId(intervalId);
      } else if (data.status === "completed") {
        setIsLoading(false);
        setSyncStatus("completed");
        setResult("同期が完了しました。");
      } else if (data.status === "error") {
        setIsLoading(false);
        setSyncStatus("error");
        setResult(`同期中にエラーが発生しました: ${data.errorMessage}`);
      } else {
        setIsLoading(false);
        setSyncStatus(null);
        setResult(null);
      }
    } catch (error) {
      console.error("Failed to check initial sync status:", error);
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

  const checkSyncStatus = async () => {
    try {
      const response = await fetch(
        `/api/salonboard-sync-status?userId=${user!.id}`
      );
      const data = await response.json();

      if (data.status === "completed") {
        setIsLoading(false);
        setSyncStatus("completed");
        setResult("同期が完了しました。");
        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
        }
      } else if (data.status === "error") {
        setIsLoading(false);
        setSyncStatus("error");
        setResult(`同期中にエラーが発生しました: ${data.errorMessage}`);
        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
        }
      } else {
        // まだ同期中
        setSyncStatus("in_progress");
        setResult("同期中...");
      }
    } catch (error) {
      console.error("Failed to check sync status:", error);
    }
  };

  // 新しい同期ボタンのハンドラ
  const handleFullSync = async () => {
    setIsLoading(true);
    setResult(null);
    setSyncStatus("in_progress");

    try {
      const response = await fetch("/api/salonboard-integration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ haloTaroUserId: user!.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "同期に失敗しました");
      }

      const data = await response.json();
      setResult(data.message);

      // 同期状態のポーリングを開始
      const intervalId = setInterval(checkSyncStatus, 5000); // 5秒ごとにチェック
      setPollingIntervalId(intervalId);
    } catch (error) {
      setIsLoading(false);
      setSyncStatus("error");
      setResult("同期中にエラーが発生しました。もう一度お試しください。");
    }
  };

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
                  {isLoading && syncStatus !== "in_progress"
                    ? "保存中..."
                    : "ログイン情報を保存"}
                </Button>
                <div className="flex space-x-4">
                  <Button
                    onClick={handleFullSync}
                    disabled={isLoading || !savedCredentials}
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                  >
                    {isLoading && syncStatus === "in_progress" ? (
                      <>
                        同期中...
                        <Loader2 className="ml-2 animate-spin" />
                      </>
                    ) : (
                      "サロンボードと同期"
                    )}
                  </Button>
                </div>
              </div>
              {result && (
                <Alert className="mt-4">
                  <AlertTitle>
                    {syncStatus === "completed"
                      ? "同期完了"
                      : syncStatus === "error"
                      ? "エラー"
                      : "同期中"}
                  </AlertTitle>
                  <AlertDescription>{result}</AlertDescription>
                </Alert>
              )}
            </>
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
