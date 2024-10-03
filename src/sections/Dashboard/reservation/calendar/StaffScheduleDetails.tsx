import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Reservation } from '@/types/reservation';
import moment from 'moment';

interface StaffScheduleDetailsProps {
  staffSchedule: Reservation;
  onClose: () => void;
  onEdit: () => void;
}

const StaffScheduleDetails: React.FC<StaffScheduleDetailsProps> = ({ staffSchedule, onClose, onEdit }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>スタッフスケジュール詳細</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p><strong>スタッフ名:</strong> {staffSchedule.staff_name}</p>
          <p><strong>イベント:</strong> {staffSchedule.event}</p>
          <p><strong>開始時間:</strong> {moment.utc(staffSchedule.start_time).local().format('YYYY/MM/DD HH:mm')}</p>
          <p><strong>終了時間:</strong> {moment.utc(staffSchedule.end_time).local().format('YYYY/MM/DD HH:mm')}</p>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <Button onClick={onEdit}>編集</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffScheduleDetails;