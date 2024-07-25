"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bell, Mail, Smartphone } from "lucide-react";

interface NotificationSetting {
  id: string;
  name: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

const NotificationSettingsView: React.FC = () => {
  const [emailAddress, setEmailAddress] = useState("user@example.com");
  const [phoneNumber, setPhoneNumber] = useState("090-1234-5678");
  const [notificationTime, setNotificationTime] = useState("immediately");
  const [notificationSettings, setNotificationSettings] = useState<
    NotificationSetting[]
  >([
    { id: "1", name: "新規予約", email: true, sms: false, push: true },
    { id: "2", name: "予約変更", email: true, sms: false, push: true },
    { id: "3", name: "予約キャンセル", email: true, sms: true, push: true },
    { id: "4", name: "レビュー投稿", email: true, sms: false, push: false },
    { id: "5", name: "売上報告", email: true, sms: false, push: false },
  ]);

  const handleNotificationToggle = (
    id: string,
    type: "email" | "sms" | "push"
  ) => {
    setNotificationSettings(
      notificationSettings.map((setting) =>
        setting.id === id ? { ...setting, [type]: !setting[type] } : setting
      )
    );
  };

  const handleSave = () => {
    console.log("Settings saved:", {
      emailAddress,
      phoneNumber,
      notificationTime,
      notificationSettings,
    });
    // ここで設定を保存するAPIを呼び出す
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">通知設定</h2>

      <Tabs defaultValue="general" className="mb-6">
        <TabsList>
          <TabsTrigger value="general">一般設定</TabsTrigger>
          <TabsTrigger value="notifications">通知項目</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">一般通知設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">通知用メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">通知用電話番号（SMS用）</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>通知のタイミング</Label>
                <RadioGroup
                  value={notificationTime}
                  onValueChange={setNotificationTime}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="immediately" id="immediately" />
                    <Label htmlFor="immediately">即時</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily">1日1回まとめて</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly">週1回まとめて</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">通知項目設定</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr>
                    <th>通知項目</th>
                    <th className="text-center">
                      <Mail className="inline-block" /> メール
                    </th>
                    <th className="text-center">
                      <Smartphone className="inline-block" /> SMS
                    </th>
                    <th className="text-center">
                      <Bell className="inline-block" /> プッシュ通知
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {notificationSettings.map((setting) => (
                    <tr key={setting.id}>
                      <td>{setting.name}</td>
                      <td className="text-center">
                        <Checkbox
                          checked={setting.email}
                          onCheckedChange={() =>
                            handleNotificationToggle(setting.id, "email")
                          }
                        />
                      </td>
                      <td className="text-center">
                        <Checkbox
                          checked={setting.sms}
                          onCheckedChange={() =>
                            handleNotificationToggle(setting.id, "sms")
                          }
                        />
                      </td>
                      <td className="text-center">
                        <Checkbox
                          checked={setting.push}
                          onCheckedChange={() =>
                            handleNotificationToggle(setting.id, "push")
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>注意</AlertTitle>
        <AlertDescription>
          重要な通知をオフにすると、サービスの利用に支障が出る可能性があります。
        </AlertDescription>
      </Alert>

      <Button onClick={handleSave}>設定を保存</Button>
    </div>
  );
};

export default NotificationSettingsView;
