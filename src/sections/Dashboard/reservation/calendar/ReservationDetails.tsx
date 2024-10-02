import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Reservation } from '@/types/reservation';
import moment from 'moment';

interface ReservationDetailsProps {
  reservation: Reservation;
  onClose: () => void;
  onEdit: () => void;
}

const ReservationDetails: React.FC<ReservationDetailsProps> = ({ reservation, onClose, onEdit }) => {
  console.log('Rendering ReservationDetails with reservation:', reservation);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>予約詳細</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          <p><strong>顧客名:</strong> {reservation.customer_name}</p>
          <p><strong>メニュー:</strong> {reservation.menu_name}</p>
          <p><strong>担当スタッフ:</strong> {reservation.staff_name}</p>
          <p><strong>開始時間:</strong> {moment.utc(reservation.start_time).local().format('YYYY/MM/DD HH:mm:ss')}</p>
          <p><strong>終了時間:</strong> {moment.utc(reservation.end_time).local().format('YYYY/MM/DD HH:mm:ss')}</p>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <Button onClick={onEdit}>編集</Button>
          <Button onClick={onClose}>閉じる</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationDetails;