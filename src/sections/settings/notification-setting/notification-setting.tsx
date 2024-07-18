"use client";

import React, { useState } from "react";
import { Mail, Bell, Smartphone } from "lucide-react";

interface NotificationSettings {
  sendConfirmationEmail: boolean;
  sendReminderEmail: boolean;
  sendCancellationEmail: boolean;
  sendSMS: boolean;
  sendPushNotification: boolean;
  reminderTiming: number;
  emailTemplate: string;
}

const initialNotificationSettings: NotificationSettings = {
  sendConfirmationEmail: true,
  sendReminderEmail: true,
  sendCancellationEmail: true,
  sendSMS: false,
  sendPushNotification: false,
  reminderTiming: 24,
  emailTemplate: "予約確認メールのテンプレート",
};

const NotificationSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>(
    initialNotificationSettings
  );

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ここでAPIを呼び出して設定を保存する
    console.log("保存された通知設定:", settings);
    alert("通知設定が保存されました");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">通知設定</h1>
      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">メール通知</h2>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="sendConfirmationEmail"
                checked={settings.sendConfirmationEmail}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <Mail className="mr-2" />
              予約確認メールを送信する
            </label>
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="sendReminderEmail"
                checked={settings.sendReminderEmail}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <Bell className="mr-2" />
              リマインダーメールを送信する
            </label>
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="sendCancellationEmail"
                checked={settings.sendCancellationEmail}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <Mail className="mr-2" />
              キャンセル確認メールを送信する
            </label>
          </div>
        </div>

        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">その他の通知方法</h2>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="sendSMS"
                checked={settings.sendSMS}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <Smartphone className="mr-2" />
              SMSで通知を送信する
            </label>
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="sendPushNotification"
                checked={settings.sendPushNotification}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <Bell className="mr-2" />
              プッシュ通知を送信する
            </label>
          </div>
        </div>

        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">リマインダー設定</h2>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="reminderTiming"
            >
              リマインダー送信タイミング（予約時間の何時間前）
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="reminderTiming"
              type="number"
              name="reminderTiming"
              value={settings.reminderTiming}
              onChange={handleInputChange}
              min="1"
              max="72"
            />
          </div>
        </div>

        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">メールテンプレート</h2>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="emailTemplate"
            >
              予約確認メールのテンプレート
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="emailTemplate"
              name="emailTemplate"
              value={settings.emailTemplate}
              onChange={handleInputChange}
              rows={6}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
          >
            設定を保存
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationSettingsPage;
