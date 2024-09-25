// app/components/SalonboardAutomation.tsx

"use client";

import React, { useState } from "react";

const SalonboardAutomation: React.FC = () => {
  const [userId, setUserId] = useState("CD92702");
  const [password, setPassword] = useState("lowe@0053");
  const [date, setDate] = useState("20241213"); // デフォルト日付
  const [rsvHour, setRsvHour] = useState("10"); // デフォルト開始時間
  const [rsvMinute, setRsvMinute] = useState("00"); // デフォルト開始分
  const [staffName, setStaffName] = useState("斉藤 憲司"); // スタッフ名
  const [nmSeiKana, setNmSeiKana] = useState("ヤマダ");
  const [nmMeiKana, setNmMeiKana] = useState("タロウ");
  const [nmSei, setNmSei] = useState("山田");
  const [nmMei, setNmMei] = useState("太郎");

  // 所要時間のステートを追加
  const [rsvTermHour, setRsvTermHour] = useState("60"); // デフォルト: 60分
  const [rsvTermMinute, setRsvTermMinute] = useState("00"); // デフォルト: 00分

  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // エラーステートを追加

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult("");
    setError(null); // エラーステートをリセット

    try {
      const response = await fetch("/api/salonboard-automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          password,
          date,
          rsv_hour: rsvHour,
          rsv_minute: rsvMinute,
          staff_name: staffName, // スタッフ名を送信
          nm_sei_kana: nmSeiKana,
          nm_mei_kana: nmMeiKana,
          nm_sei: nmSei,
          nm_mei: nmMei,
          rsv_term_hour: rsvTermHour, // 所要時間の追加
          rsv_term_minute: rsvTermMinute, // 所要時間の追加
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // エラーレスポンスの場合
        setError(data.error || "Automation failed");
      } else {
        setResult(data.message);
      }
    } catch (error) {
      console.error("Error occurred:", error);
      setError("Error occurred while running automation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Salonboard Automation Test
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ユーザーID */}
        <div>
          <label
            htmlFor="userId"
            className="block text-sm font-medium text-gray-700"
          >
            ユーザーID
          </label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="ユーザーIDを入力してください"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        {/* パスワード */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力してください"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        {/* スタッフ名 */}
        <div>
          <label
            htmlFor="staffName"
            className="block text-sm font-medium text-gray-700"
          >
            スタッフ名
          </label>
          <input
            id="staffName"
            type="text"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="スタッフ名を入力してください"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        {/* 所要時間 */}
        <div>
          <label
            htmlFor="rsvTerm"
            className="block text-sm font-medium text-gray-700"
          >
            所要時間
          </label>
          <div className="flex space-x-2">
            <select
              id="rsvTermHour"
              value={rsvTermHour}
              onChange={(e) => setRsvTermHour(e.target.value)}
              required
              className="mt-1 block w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              {/* 所要時間の選択肢: 0分から1440分まで、60分刻み */}
              {Array.from({ length: 25 }, (_, i) => i * 60).map((hour) => (
                <option key={hour} value={hour.toString()}>
                  {hour / 60}時間
                </option>
              ))}
            </select>
            <select
              id="rsvTermMinute"
              value={rsvTermMinute}
              onChange={(e) => setRsvTermMinute(e.target.value)}
              required
              className="mt-1 block w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              {/* 0分から55分まで、5分刻み */}
              {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                <option key={minute} value={minute.toString().padStart(2, "0")}>
                  {minute}分
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* 実行ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? "実行中..." : "テストを実行"}
        </button>
      </form>
      {/* 結果表示 */}
      {result && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">結果:</h2>
          <p>{result}</p>
        </div>
      )}
      {/* エラー表示 */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 rounded">
          <h2 className="text-lg font-semibold mb-2">エラー:</h2>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default SalonboardAutomation;
