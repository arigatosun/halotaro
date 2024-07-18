"use client";

import React, { useState } from "react";
import { Clock, Plus, Trash } from "lucide-react";

interface SalonInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface BusinessHours {
  id: string;
  day: string;
  open: string;
  close: string;
}

const initialSalonInfo: SalonInfo = {
  name: "サンプルサロン",
  address: "東京都渋谷区〇〇1-2-3",
  phone: "03-1234-5678",
  email: "info@samplesalon.com",
  website: "https://www.samplesalon.com",
};

const initialBusinessHours: BusinessHours[] = [
  { id: "1", day: "月曜日", open: "10:00", close: "20:00" },
  { id: "2", day: "火曜日", open: "10:00", close: "20:00" },
  { id: "3", day: "水曜日", open: "10:00", close: "20:00" },
  { id: "4", day: "木曜日", open: "10:00", close: "20:00" },
  { id: "5", day: "金曜日", open: "10:00", close: "20:00" },
  { id: "6", day: "土曜日", open: "09:00", close: "21:00" },
  { id: "7", day: "日曜日", open: "09:00", close: "19:00" },
];

const SalonSettingsPage: React.FC = () => {
  const [salonInfo, setSalonInfo] = useState<SalonInfo>(initialSalonInfo);
  const [businessHours, setBusinessHours] =
    useState<BusinessHours[]>(initialBusinessHours);

  const handleSalonInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSalonInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleBusinessHoursChange = (
    id: string,
    field: "open" | "close",
    value: string
  ) => {
    setBusinessHours((prev) =>
      prev.map((hour) => (hour.id === id ? { ...hour, [field]: value } : hour))
    );
  };

  const addBusinessHours = () => {
    const newId = String(businessHours.length + 1);
    setBusinessHours((prev) => [
      ...prev,
      { id: newId, day: "新規曜日", open: "09:00", close: "18:00" },
    ]);
  };

  const removeBusinessHours = (id: string) => {
    setBusinessHours((prev) => prev.filter((hour) => hour.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ここでAPIを呼び出してサーバーに設定を保存する
    console.log("保存されたサロン情報:", salonInfo);
    console.log("保存された営業時間:", businessHours);
    alert("設定が保存されました");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">サロン設定</h1>
      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">基本情報</h2>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="name"
            >
              サロン名
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="name"
              type="text"
              name="name"
              value={salonInfo.name}
              onChange={handleSalonInfoChange}
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="address"
            >
              住所
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="address"
              type="text"
              name="address"
              value={salonInfo.address}
              onChange={handleSalonInfoChange}
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="phone"
            >
              電話番号
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="phone"
              type="tel"
              name="phone"
              value={salonInfo.phone}
              onChange={handleSalonInfoChange}
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="email"
            >
              メールアドレス
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              name="email"
              value={salonInfo.email}
              onChange={handleSalonInfoChange}
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="website"
            >
              ウェブサイト
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="website"
              type="url"
              name="website"
              value={salonInfo.website}
              onChange={handleSalonInfoChange}
            />
          </div>
        </div>

        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">営業時間</h2>
          {businessHours.map((hour) => (
            <div key={hour.id} className="flex items-center mb-4">
              <Clock className="mr-2" />
              <input
                className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-1/4 mr-2"
                type="text"
                value={hour.day}
                onChange={(e) =>
                  handleBusinessHoursChange(hour.id, "open", e.target.value)
                }
              />
              <input
                className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-1/4 mr-2"
                type="time"
                value={hour.open}
                onChange={(e) =>
                  handleBusinessHoursChange(hour.id, "open", e.target.value)
                }
              />
              <span className="mx-2">-</span>
              <input
                className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-1/4 mr-2"
                type="time"
                value={hour.close}
                onChange={(e) =>
                  handleBusinessHoursChange(hour.id, "close", e.target.value)
                }
              />
              <button
                type="button"
                onClick={() => removeBusinessHours(hour.id)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                <Trash size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addBusinessHours}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
          >
            <Plus size={16} className="mr-2" />
            営業時間を追加
          </button>
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

export default SalonSettingsPage;
