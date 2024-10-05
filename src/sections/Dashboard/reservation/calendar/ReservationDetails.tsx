import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Reservation } from '@/types/reservation';
import moment from 'moment';

interface ReservationDetailsProps {
  reservation: Reservation;
  onClose: () => void;
  onEdit: () => void;
  onCancel: (reservationId: string, cancellationType: string) => void;
}

const statusLabels: { [key: string]: string } = {
  confirmed: '受付待ち',
  salon_cancelled: 'サロンキャンセル',
  same_day_cancelled: '当日キャンセル',
  no_show: '無断キャンセル',
  cancelled: 'お客様キャンセル',
  paid: "会計済み",
};

const ReservationDetails: React.FC<ReservationDetailsProps> = ({ reservation, onClose, onEdit, onCancel }) => {
  const [buttonText, setButtonText] = useState('予約キャンセル');

  useEffect(() => {
    const now = moment();
    const startTime = reservation.start_time ? moment(reservation.start_time) : moment();

    if (now.isAfter(startTime)) {
      setButtonText('無断キャンセル');
    } else {
      setButtonText('予約キャンセル');
    }
  }, [reservation.start_time]);

  const handleCancelReservation = () => {
    const cancellationType = buttonText === '無断キャンセル' ? 'no_show' : 'salon_cancellation';
    onCancel(reservation.id!, cancellationType);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>予約詳細</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          <p><strong>ステータス:</strong> {reservation.status ? statusLabels[reservation.status] : '不明'}</p>
          <p><strong>顧客名:</strong> {reservation.customer_name}</p>
          <p><strong>メニュー:</strong> {reservation.menu_name}</p>
          <p><strong>担当スタッフ:</strong> {reservation.staff_name}</p>
          <p><strong>開始時間:</strong> {reservation.start_time ? moment.utc(reservation.start_time).local().format('YYYY/MM/DD HH:mm:ss') : '未定'}</p>
          <p><strong>終了時間:</strong> {reservation.end_time ? moment.utc(reservation.end_time).local().format('YYYY/MM/DD HH:mm:ss') : '未定'}</p>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <Button onClick={onEdit}>編集</Button>
          <Button variant="destructive" onClick={handleCancelReservation}>{buttonText}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationDetails;
