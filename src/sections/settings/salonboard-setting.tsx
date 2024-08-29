"use client";

import React, { useState } from "react";
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

const SalonBoardIntegrationView: React.FC = () => {
  const [isIntegrationEnabled, setIsIntegrationEnabled] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleIntegrationToggle = () => {
    setIsIntegrationEnabled(!isIntegrationEnabled);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/salonboard-integration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Integration failed");
      }

      const data = await response.json();
      setResult(data.message);
    } catch (error) {
      setResult("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
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
            <Label htmlFor="integration-toggle">連携を有効にする</Label>
          </div>

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
            </>
          )}

          <Button
            onClick={handleSave}
            disabled={!isIntegrationEnabled || isLoading}
          >
            {isLoading ? "処理中..." : "設定を保存して連携を実行"}
          </Button>

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
