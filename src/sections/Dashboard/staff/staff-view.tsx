"use client";

import React, { useEffect, useState } from "react";
import { Users, Calendar, Mail, Phone, Edit, Trash2, Plus } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  color: string;
}

const initialStaff: Staff[] = [
  {
    id: "1",
    name: "佐藤 明",
    email: "sato@example.com",
    phone: "090-1234-5678",
    role: "シニアスタイリスト",
    color: "#FF9999",
  },
  {
    id: "2",
    name: "田中 花子",
    email: "tanaka@example.com",
    phone: "090-2345-6789",
    role: "カラーリスト",
    color: "#99FF99",
  },
  {
    id: "3",
    name: "鈴木 太郎",
    email: "suzuki@example.com",
    phone: "090-3456-7890",
    role: "ジュニアスタイリスト",
    color: "#9999FF",
  },
  {
    id: "4",
    name: "高橋 美咲",
    email: "takahashi@example.com",
    phone: "090-4567-8901",
    role: "アシスタント",
    color: "#FFFF99",
  },
];

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // 初回レンダリング時に最初のスタッフを選択
    if (staff.length > 0 && !selectedStaff) {
      setSelectedStaff(staff[0]);
    }
  }, [staff, selectedStaff]);

  const handleStaffSelect = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setIsEditing(false);
  };

  const handleEditStaff = () => {
    setIsEditing(true);
  };

  const handleSaveStaff = (updatedStaff: Staff) => {
    setStaff(staff.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)));
    setSelectedStaff(updatedStaff);
    setIsEditing(false);
  };

  const handleDeleteStaff = (staffId: string) => {
    setStaff(staff.filter((s) => s.id !== staffId));
    setSelectedStaff(null);
  };

  const handleAddStaff = () => {
    const newStaff: Staff = {
      id: String(Date.now()),
      name: "新規スタッフ",
      email: "",
      phone: "",
      role: "",
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    };
    setStaff([...staff, newStaff]);
    setSelectedStaff(newStaff);
    setIsEditing(true);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">スタッフ管理</h1>
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 pr-4">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">スタッフ一覧</h2>
            <button
              onClick={handleAddStaff}
              className="bg-green-500 text-white px-2 py-1 rounded flex items-center"
            >
              <Plus className="mr-1" size={16} /> 新規追加
            </button>
          </div>
          <ul className="space-y-2">
            {staff.map((s) => (
              <li
                key={s.id}
                className={`p-2 rounded cursor-pointer flex items-center ${
                  selectedStaff?.id === s.id
                    ? "bg-blue-100"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => handleStaffSelect(s)}
              >
                <div
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: s.color }}
                ></div>
                <span>{s.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full md:w-2/3 mt-4 md:mt-0">
          {selectedStaff && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{selectedStaff.name}</h2>
                <div>
                  <button
                    onClick={handleEditStaff}
                    className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(selectedStaff.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {isEditing ? (
                <StaffEditForm staff={selectedStaff} onSave={handleSaveStaff} />
              ) : (
                <StaffDetails staff={selectedStaff} />
              )}
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">スケジュール</h3>
                <FullCalendar
                  plugins={[timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "timeGridWeek,timeGridDay",
                  }}
                  slotMinTime="09:00:00"
                  slotMaxTime="21:00:00"
                  height="auto"
                  allDaySlot={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StaffDetails: React.FC<{ staff: Staff }> = ({ staff }) => (
  <div>
    <p className="flex items-center mb-2">
      <Mail className="mr-2" size={16} /> {staff.email}
    </p>
    <p className="flex items-center mb-2">
      <Phone className="mr-2" size={16} /> {staff.phone}
    </p>
    <p className="flex items-center">
      <Users className="mr-2" size={16} /> {staff.role}
    </p>
  </div>
);

const StaffEditForm: React.FC<{
  staff: Staff;
  onSave: (staff: Staff) => void;
}> = ({ staff, onSave }) => {
  const [editedStaff, setEditedStaff] = useState(staff);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedStaff({ ...editedStaff, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedStaff);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">名前</label>
        <input
          type="text"
          name="name"
          value={editedStaff.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">
          メールアドレス
        </label>
        <input
          type="email"
          name="email"
          value={editedStaff.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">
          電話番号
        </label>
        <input
          type="tel"
          name="phone"
          value={editedStaff.phone}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">役職</label>
        <input
          type="text"
          name="role"
          value={editedStaff.role}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <button
        type="submit"
        className="bg-green-500 text-white px-4 py-2 rounded mt-4"
      >
        保存
      </button>
    </form>
  );
};

export default StaffManagement;
