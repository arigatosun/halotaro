"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bell, Mail, Plus, Trash2 } from "lucide-react";

interface NotificationSetting {
  id: string;
  name: string;
  email: boolean;
  push: boolean;
}

interface StaffEmail {
  id: string;
  email: string;
}

const NotificationSettingsView: React.FC = () => {
  const [staffEmails, setStaffEmails] = useState<StaffEmail[]>([
    { id: "1", email: "user@example.com" },
  ]);
  const [notificationTime, setNotificationTime] = useState("immediately");
  const [notificationSettings, setNotificationSettings] = useState<
    NotificationSetting[]
  >([
    { id: "1", name: "新規予約", email: true, push: true },
    { id: "2", name: "予約変更", email: true, push: true },
    { id: "3", name: "予約キャンセル", email: true, push: true },
    { id: "4", name: "レビュー投稿", email: true, push: false },
    { id: "5", name: "売上報告", email: true, push: false },
  ]);

  const handleNotificationToggle = (id: string, type: "email" | "push") => {
    setNotificationSettings(
      notificationSettings.map((setting) =>
        setting.id === id ? { ...setting, [type]: !setting[type] } : setting
      )
    );
  };

  const handleAddStaffEmail = () => {
    const newId = (staffEmails.length + 1).toString();
    setStaffEmails([...staffEmails, { id: newId, email: "" }]);
  };

  const handleRemoveStaffEmail = (id: string) => {
    setStaffEmails(staffEmails.filter((email) => email.id !== id));
  };

  const handleStaffEmailChange = (id: string, value: string) => {
    setStaffEmails(
      staffEmails.map((email) =>
        email.id === id ? { ...email, email: value } : email
      )
    );
  };

  const handleSave = () => {
    console.log("Settings saved:", {
      staffEmails,
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
                <Label>スタッフ用通知メールアドレス</Label>
                {staffEmails.map((staffEmail, index) => (
                  <div
                    key={staffEmail.id}
                    className="flex items-center space-x-2"
                  >
                    <Input
                      type="email"
                      value={staffEmail.email}
                      onChange={(e) =>
                        handleStaffEmailChange(staffEmail.id, e.target.value)
                      }
                      placeholder={`スタッフ ${index + 1} のメールアドレス`}
                    />
                    {staffEmails.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStaffEmail(staffEmail.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  onClick={handleAddStaffEmail}
                  variant="outline"
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" /> メールアドレスを追加
                </Button>
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
