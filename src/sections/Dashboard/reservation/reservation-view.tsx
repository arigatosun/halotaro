"use client";

import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import timelinePlugin from "@fullcalendar/timeline";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import { Plus } from "lucide-react";

// スタッフの型を定義
type StaffMember = "佐藤" | "田中" | "鈴木" | "高橋";

// staffColors の型を定義
const staffColors: { [key in StaffMember]: string } = {
  佐藤: "#FF9999",
  田中: "#99FF99",
  鈴木: "#9999FF",
  高橋: "#FFFF99",
};

interface Reservation {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    client: string;
    service: string;
    staff: StaffMember;
  };
}

const services = ["カット", "カラー", "パーマ", "トリートメント"];

const generateRandomReservations = (): Reservation[] => {
  const reservations: Reservation[] = [];
  const startDate = new Date(2024, 6, 6); // 7月6日
  const endDate = new Date(2024, 6, 12); // 7月12日

  // 各スタッフの予約状況を追跡するオブジェクト
  const staffSchedules: { [key in StaffMember]: { start: Date; end: Date }[] } =
    {
      佐藤: [],
      田中: [],
      鈴木: [],
      高橋: [],
    };

  // 時間枠が重複しているかチェックする関数
  const isTimeSlotAvailable = (
    staff: StaffMember,
    start: Date,
    end: Date
  ): boolean => {
    return !staffSchedules[staff].some(
      (booking) => start < booking.end && end > booking.start
    );
  };

  for (
    let date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    const dailyReservationCount = Math.floor(Math.random() * 3) + 9; // 9~11件/日

    let attempts = 0;
    const maxAttempts = 30; // 最大試行回数

    while (
      reservations.filter((r) =>
        r.start.startsWith(date.toISOString().split("T")[0])
      ).length < dailyReservationCount &&
      attempts < maxAttempts
    ) {
      const staff = Object.keys(staffColors)[
        Math.floor(Math.random() * Object.keys(staffColors).length)
      ] as StaffMember;
      const service = services[Math.floor(Math.random() * services.length)];

      const startHour = 9 + Math.floor(Math.random() * 9); // 9時〜17時
      const startMinute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45分
      const startTime = new Date(date);
      startTime.setHours(startHour, startMinute, 0);

      const durationMinutes = 60 + Math.floor(Math.random() * 4) * 30; // 60〜150分
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      if (isTimeSlotAvailable(staff, startTime, endTime)) {
        staffSchedules[staff].push({ start: startTime, end: endTime });

        reservations.push({
          id: `res-${date.toISOString()}-${reservations.length}`,
          title: `${staff} - ${service}`,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          backgroundColor: staffColors[staff],
          borderColor: staffColors[staff],
          extendedProps: {
            client: `顧客${date.getDate()}-${reservations.length + 1}`,
            service: service,
            staff: staff,
          },
        });
      }

      attempts++;
    }
  }

  return reservations;
};

const ReservationManagement: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>(
    generateRandomReservations()
  );
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  // リソース（スタッフ）の定義
  const resources = Object.keys(staffColors).map((staff) => ({
    id: staff,
    title: staff,
  }));

  const handleEventClick = (info: any) => {
    setSelectedReservation(info.event.extendedProps);
    // ここで予約詳細モーダルを開く
  };

  const handleEventDrop = (info: any) => {
    const updatedReservations = reservations.map((res) =>
      res.id === info.event.id
        ? {
            ...res,
            start: info.event.start.toISOString(),
            end: info.event.end.toISOString(),
          }
        : res
    );
    setReservations(updatedReservations);
    // ここでバックエンドAPIを呼び出して更新を保存
  };

  const handleDateSelect = (selectInfo: any) => {
    const title = prompt("新規予約のタイトルを入力してください:");
    if (title) {
      const [staffName, service] = title.split(" - ");
      const staff = staffName as StaffMember;
      const newReservation: Reservation = {
        id: String(Date.now()),
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        backgroundColor: staffColors[staff] || "#CCCCCC",
        borderColor: staffColors[staff] || "#CCCCCC",
        extendedProps: {
          client: "新規顧客",
          service: service || "未指定",
          staff: staff || ("未指定" as StaffMember),
        },
      };
      setReservations([...reservations, newReservation]);
      // ここでバックエンドAPIを呼び出して新規予約を保存
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">予約管理</h1>
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => {
            /* 新規予約モーダルを開く */
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded flex items-center"
        >
          <Plus className="mr-2" /> 新規予約
        </button>
        <button
          onClick={() => {
            /* 時間ブロッキングモーダルを開く */
          }}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          時間ブロック
        </button>
      </div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">担当者凡例</h2>
        <div className="flex space-x-4">
          {Object.entries(staffColors).map(([staff, color]) => (
            <div key={staff} className="flex items-center">
              <div
                className="w-4 h-4 mr-2"
                style={{ backgroundColor: color }}
              ></div>
              <span>{staff}</span>
            </div>
          ))}
        </div>
      </div>
      <FullCalendar
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        themeSystem="bootstrap5"
        initialView="resourceTimelineWeek"
        headerToolbar={{
          left: "title prev,next today",
          center: "",
          right: "",
        }}
        resources={resources}
        events={reservations.map((res) => ({
          ...res,
          resourceId: res.extendedProps.staff,
        }))}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        select={handleDateSelect}
        height="auto"
        slotMinTime="09:00:00"
        slotMaxTime="21:00:00"
      />
      {/* 予約詳細/編集モーダル（実装は省略） */}
    </div>
  );
};

export default ReservationManagement;
