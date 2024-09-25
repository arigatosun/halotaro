import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Reservation } from '@/types/reservation';

interface ReservationDetailsProps {
  reservation: Reservation;
  onClose: () => void;
  onEdit: () => void;
}

const ReservationDetails: React.FC<ReservationDetailsProps> = ({ reservation, onClose, onEdit }) => {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約詳細</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p><strong>顧客名:</strong> {reservation.customer_name}</p>
            <p><strong>メニュー:</strong> {reservation.menu_name}</p>
            <p><strong>担当スタッフ:</strong> {reservation.staff_name}</p>
            <p><strong>開始時間:</strong> {new Date(reservation.start_time).toLocaleString()}</p>
            <p><strong>終了時間:</strong> {new Date(reservation.end_time).toLocaleString()}</p>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button onClick={onEdit}>時間を編集</Button>
            <Button onClick={onClose}>閉じる</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

export default ReservationDetails;