import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useReservation } from "@/contexts/reservationcontext";
import { Calendar, momentLocalizer, SlotInfo } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// react-big-calendarの日本語化
import "moment/locale/ja";
moment.locale("ja");
const localizer = momentLocalizer(moment);

interface DateSelectionProps {
  onDateTimeSelect: (dateTime: Date) => void;
  onBack: () => void;
}

interface CustomEvent {
  title: string;
  start: Date;
  end: Date;
  isAvailable: boolean;
}

const DateSelection: React.FC<DateSelectionProps> = ({
  onDateTimeSelect,
  onBack,
}) => {
  const { selectedDateTime, setSelectedDateTime } = useReservation();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<Date[]>([]);

  // 仮の予約可能・不可能日データを生成
  const events: CustomEvent[] = useMemo(() => {
    const result: CustomEvent[] = [];
    const startDate = new Date(2024, 7, 1); // 2024年8月1日
    const endDate = new Date(2024, 7, 31); // 2024年8月31日

    let availableDaysCount = 0;
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5; // 0は日曜日、6は土曜日

      // 週末は常に休み、平日はランダムに休みを設定（ただし、利用可能日が20日になるまで）
      const isAvailable =
        !isWeekend && (Math.random() < 0.8 || availableDaysCount < 20);

      if (isAvailable) {
        availableDaysCount++;
      }

      result.push({
        title: isAvailable ? "〇" : "",
        start: new Date(date),
        end: new Date(date),
        isAvailable: isAvailable,
      });

      // 20日の予約可能日に達したら、残りの日を全て休みに設定
      if (availableDaysCount >= 20) {
        break;
      }
    }

    return result;
  }, []);

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      const clickedDate = new Date(slotInfo.start);
      clickedDate.setHours(0, 0, 0, 0); // 時刻部分をリセット

      const selectedEvent = events.find(
        (event) => event.start.getTime() === clickedDate.getTime()
      );

      if (selectedEvent && selectedEvent.isAvailable) {
        setSelectedDate(clickedDate);

        // この日の予約可能な時間枠を生成（実際にはAPIから取得する）
        const times = [];
        for (let i = 10; i <= 17; i++) {
          times.push(
            new Date(
              clickedDate.getFullYear(),
              clickedDate.getMonth(),
              clickedDate.getDate(),
              i,
              0
            )
          );
          times.push(
            new Date(
              clickedDate.getFullYear(),
              clickedDate.getMonth(),
              clickedDate.getDate(),
              i,
              30
            )
          );
        }
        setAvailableTimes(times);
        setIsTimeDialogOpen(true);
      }
    },
    [events]
  );

  const handleSelectEvent = useCallback((event: CustomEvent) => {
    if (event.isAvailable) {
      setSelectedDate(new Date(event.start));
      const times = [];
      for (let i = 10; i <= 17; i++) {
        times.push(new Date(new Date(event.start).setHours(i, 0, 0, 0)));
        times.push(new Date(new Date(event.start).setHours(i, 30, 0, 0)));
      }
      setAvailableTimes(times);
      setIsTimeDialogOpen(true);
    }
  }, []);

  const handleTimeSelect = (time: Date) => {
    setSelectedDateTime(time);
    setIsTimeDialogOpen(false);
    onDateTimeSelect(time); // この行を追加
  };

  const eventStyleGetter = (event: CustomEvent) => {
    if (event.isAvailable) {
      return {
        style: {
          backgroundColor: "#34D399",
          color: "white",
          borderRadius: "0px",
          opacity: 0.8,
          border: "none",
          display: "block",
        },
      };
    }
    return {}; // 予約不可能な日は特別なスタイルを適用しない
  };

  const dayPropGetter = (date: Date) => {
    const event = events.find(
      (e) => e.start.toDateString() === date.toDateString()
    );
    if (event && !event.isAvailable) {
      return {
        style: {
          backgroundColor: "#E5E7EB", // グレーの背景色
          cursor: "not-allowed", // カーソルを変更して選択不可を示す
        },
      };
    }
    return {};
  };

  const formatDateTime = (dateTime: Date | null): string => {
    if (!dateTime) return "日時未選択";
    return dateTime.toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long",
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">日時を選択してください</h2>
      <div className="space-y-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 400 }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          views={["month"]}
          eventPropGetter={eventStyleGetter}
          dayPropGetter={dayPropGetter}
        />
        <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>時間を選択</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2">
              {availableTimes.map((time) => (
                <Button
                  key={time.toISOString()}
                  onClick={() => handleTimeSelect(time)}
                  variant="outline"
                >
                  {time.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <div>選択された日時: {formatDateTime(selectedDateTime)}</div>
      </div>
      <div className="space-x-4">
        <Button onClick={onBack} variant="outline">
          戻る
        </Button>
      </div>
    </div>
  );
};

export default DateSelection;
