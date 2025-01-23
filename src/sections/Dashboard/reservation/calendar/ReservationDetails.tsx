import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Reservation } from "@/types/reservation";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";

interface ReservationDetailsProps {
  reservation: Reservation;
  onClose: () => void;
  onEdit: () => void;
  onCancel: (reservationId: string, cancellationType: string) => void;
}

const statusLabels: { [key: string]: string } = {
  confirmed: "受付待ち",
  salon_cancelled: "サロンキャンセル",
  same_day_cancelled: "当日キャンセル",
  no_show: "無断キャンセル",
  cancelled: "お客様キャンセル",
  paid: "会計済み",
};

const ReservationDetails: React.FC<ReservationDetailsProps> = ({
  reservation,
  onClose,
  onEdit,
  onCancel,
}) => {
  const [buttonText, setButtonText] = useState("予約キャンセル");
  const [showAccountingButton, setShowAccountingButton] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const now = moment();
    const startTime = reservation.start_time
      ? moment(reservation.start_time)
      : moment();

    if (now.isAfter(startTime)) {
      setButtonText("無断キャンセル");
      setShowAccountingButton(true);
    } else {
      setButtonText("予約キャンセル");
      setShowAccountingButton(false);
    }
  }, [reservation.start_time]);

  const handleCancelReservation = () => {
    const cancellationType =
      buttonText === "無断キャンセル" ? "no_show" : "salon_cancelled";
    onCancel(reservation.id!, cancellationType);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      {/* 画面が小さい時でもスクロール可能に */}
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>予約詳細</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          <p>
            <strong>ステータス:</strong>{" "}
            {reservation.status ? statusLabels[reservation.status] : "不明"}
          </p>
          <p>
            <strong>顧客名:</strong> {reservation.customer_name}
          </p>

          {/* メニュー or クーポンの判定表示 */}
          <p>
            <strong>メニュー/クーポン:</strong>{" "}
            {/* 
                - menu_id があれば reservation.menu_name を優先
                - なければ coupon_name を表示
                - いずれも無ければ "不明" 等
            */}
            {reservation.menu_id && reservation.menu_name
              ? reservation.menu_name
              : reservation.coupon_id && reservation.coupons?.name
              ? reservation.coupons?.name
              : "未設定 or 不明"}
          </p>

          <p>
            <strong>担当スタッフ:</strong> {reservation.staff_name}
          </p>
          <p>
            <strong>開始時間:</strong>{" "}
            {reservation.start_time
              ? moment(reservation.start_time)
                  .tz("Asia/Tokyo")
                  .format("YYYY/MM/DD HH:mm:ss")
              : "未定"}
          </p>
          <p>
            <strong>終了時間:</strong>{" "}
            {reservation.end_time
              ? moment(reservation.end_time)
                  .tz("Asia/Tokyo")
                  .format("YYYY/MM/DD HH:mm:ss")
              : "未定"}
          </p>
        </div>

        <div className="mt-4 flex justify-end space-x-2">
          <Button onClick={onEdit}>編集</Button>
          {showAccountingButton && (
            <Button
              onClick={() =>
                router.push(
                  `/dashboard/reservations/${reservation.id}/accounting`
                )
              }
            >
              会計
            </Button>
          )}
          <Button variant="destructive" onClick={handleCancelReservation}>
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationDetails;
