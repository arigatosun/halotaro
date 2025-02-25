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

          {/* メインメニュー/クーポン表示 */}
          <div>
            <strong>メインメニュー:</strong>
            <div className="ml-3 mt-1 mb-3">
              {(reservation.menu_id && reservation.menu_name) || (reservation.coupon_id && reservation.coupons?.name) ? (
                <div className="flex items-center bg-orange-50 p-2 rounded-md">
                  <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  <span className="font-medium">
                    {reservation.menu_id && reservation.menu_name
                      ? reservation.menu_name
                      : reservation.coupon_id && reservation.coupons?.name
                      ? reservation.coupons?.name
                      : ""}
                  </span>
                  {reservation.menu_id && reservation.menu_items?.duration && (
                    <span className="text-gray-500 text-sm ml-2">({reservation.menu_items.duration}分)</span>
                  )}
                  {reservation.coupon_id && reservation.coupons?.duration && (
                    <span className="text-gray-500 text-sm ml-2">({reservation.coupons.duration}分)</span>
                  )}
                  <span className="font-semibold ml-auto">
                    ¥{(reservation.menu_id && reservation.menu_items?.price 
                      ? reservation.menu_items.price 
                      : reservation.coupon_id && reservation.coupons?.price 
                      ? reservation.coupons.price 
                      : 0).toLocaleString()}
                  </span>
                </div>
              ) : (
                <span className="text-gray-500">メインメニューなし</span>
              )}
            </div>
            
            {/* 追加メニュー表示 */}
            {reservation.reservation_menu_items && reservation.reservation_menu_items.length > 0 && (
              <div className="mb-3">
                <strong>追加メニュー:</strong>
                <div className="ml-3 mt-1 space-y-1 border-l-2 border-orange-200 pl-3">
                  {reservation.reservation_menu_items.map((item, index) => (
                    <div key={index} className="flex items-center bg-gray-50 p-2 rounded-md">
                      <span className="inline-block w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-500 text-sm ml-2">({item.duration}分)</span>
                      <span className="font-semibold ml-auto">¥{item.price.toLocaleString()}</span>
                    </div>
                  ))}
                  
                  {/* 追加メニューの合計 */}
                  <div className="flex justify-between pt-1 text-sm font-medium">
                    <span>追加メニュー合計:</span>
                    <span>
                      ¥{reservation.reservation_menu_items.reduce((sum, item) => sum + item.price, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 総合計 */}
            {reservation.reservation_menu_items && reservation.reservation_menu_items.length > 0 && (
              <div className="bg-gray-100 p-2 rounded-md mt-2">
                <div className="flex justify-between font-bold">
                  <span>総合計金額:</span>
                  <span className="text-orange-600">
                    ¥{(
                      (reservation.menu_id && reservation.menu_items?.price ? reservation.menu_items.price : 0) +
                      (reservation.coupon_id && reservation.coupons?.price ? reservation.coupons.price : 0) +
                      reservation.reservation_menu_items.reduce((sum, item) => sum + item.price, 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

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
