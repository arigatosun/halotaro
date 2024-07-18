"use client";

import React, { useState } from "react";
import { Link, Clock, RefreshCw, AlertTriangle } from "lucide-react";

interface HotpepperSettings {
  enableSync: boolean;
  apiKey: string;
  salonId: string;
  syncFrequency: number;
  lastSyncTime: string;
}

const initialHotpepperSettings: HotpepperSettings = {
  enableSync: false,
  apiKey: "",
  salonId: "",
  syncFrequency: 60,
  lastSyncTime: "2023-07-15 15:30:00",
};

const HotpepperSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<HotpepperSettings>(
    initialHotpepperSettings
  );

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ここでAPIを呼び出して設定を保存する
    console.log("保存されたホットペッパー連携設定:", settings);
    alert("ホットペッパー連携設定が保存されました");
  };

  const handleManualSync = () => {
    // ここで手動同期のAPIを呼び出す
    console.log("手動同期を実行");
    alert("手動同期を開始しました");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">ホットペッパー連携設定</h1>
      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">基本設定</h2>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="enableSync"
                checked={settings.enableSync}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <Link className="mr-2" />
              ホットペッパーとの同期を有効にする
            </label>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="apiKey"
            >
              APIキー
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="apiKey"
              type="text"
              name="apiKey"
              value={settings.apiKey}
              onChange={handleInputChange}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="salonId"
            >
              サロンID
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="salonId"
              type="text"
              name="salonId"
              value={settings.salonId}
              onChange={handleInputChange}
              placeholder="HP0000000"
            />
          </div>
        </div>

        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">同期設定</h2>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="syncFrequency"
            >
              同期頻度（分）
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="syncFrequency"
              name="syncFrequency"
              value={settings.syncFrequency}
              onChange={handleInputChange}
            >
              <option value={15}>15分</option>
              <option value={30}>30分</option>
              <option value={60}>1時間</option>
              <option value={120}>2時間</option>
            </select>
          </div>
          <div className="mb-4">
            <p className="text-gray-700 text-sm">
              <Clock className="inline-block mr-2" />
              最終同期時刻: {settings.lastSyncTime}
            </p>
          </div>
          <div className="mb-4">
            <button
              type="button"
              onClick={handleManualSync}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
            >
              <RefreshCw className="mr-2" />
              手動で同期を実行
            </button>
          </div>
        </div>

        <div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4"
          role="alert"
        >
          <p className="font-bold flex items-center">
            <AlertTriangle className="mr-2" />
            注意
          </p>
          <p>
            ホットペッパーとの同期を有効にすると、予約情報が自動的に同期されます。重複予約を避けるため、設定には十分ご注意ください。
          </p>
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

export default HotpepperSettingsPage;
