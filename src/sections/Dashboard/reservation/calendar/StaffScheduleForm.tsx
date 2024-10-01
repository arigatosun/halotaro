import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Reservation, Staff } from '@/types/reservation';
import moment from 'moment';

interface StaffScheduleFormProps {
  staffSchedule: Partial<Reservation> | null;
  isNew: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>, isNew: boolean) => void;
  onDelete: (id: string) => void;
  staffList: Staff[];
}

const StaffScheduleForm: React.FC<StaffScheduleFormProps> = ({
  staffSchedule,
  isNew,
  onClose,
  onSubmit,
  onDelete,
  staffList
}) => {
  const [formData, setFormData] = useState<Partial<Reservation>>({});

  useEffect(() => {
    if (staffSchedule) {
      setFormData({
        ...staffSchedule,
        start_time: moment.utc(staffSchedule.start_time).local().format('YYYY-MM-DDTHH:mm'),
        end_time: moment.utc(staffSchedule.end_time).local().format('YYYY-MM-DDTHH:mm'),
      });
    } else {
      setFormData({ is_staff_schedule: true });
    }
  }, [staffSchedule]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSchedule = {
      ...formData,
      start_time: moment(formData.start_time).utc().format(),
      end_time: moment(formData.end_time).utc().format(),
      is_staff_schedule: true,
    };
    onSubmit(updatedSchedule, isNew);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isNew ? 'スタッフスケジュール追加' : 'スタッフスケジュール編集'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff_id">スタッフ</Label>
              <Select
                value={formData.staff_id || ''}
                onValueChange={(value) => handleChange('staff_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="スタッフを選択" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event">イベント</Label>
              <Select
                value={formData.event || ''}
                onValueChange={(value) => handleChange('event', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="イベントを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="休憩">休憩</SelectItem>
                  <SelectItem value="会議">会議</SelectItem>
                  <SelectItem value="その他">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_time">開始時間</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time || ''}
                onChange={(e) => handleChange('start_time', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">終了時間</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time || ''}
                onChange={(e) => handleChange('end_time', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <Button type="submit">{isNew ? '追加' : '更新'}</Button>
            {!isNew && formData.id && (
              <Button type="button" variant="destructive" onClick={() => onDelete(formData.id!)}>
                削除
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StaffScheduleForm;