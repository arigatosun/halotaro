// StaffScheduleForm.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Reservation, Staff } from '@/types/reservation';
import moment from 'moment';
import { Alert } from '@mui/material';

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
  const [formData, setFormData] = useState<Partial<Reservation>>({
    staff_id: '',
    event: '',
    start_time: '',
    end_time: '',
    is_staff_schedule: true,
    status: 'staff',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (staffSchedule) {
      setFormData({
        ...staffSchedule,
        start_time: staffSchedule.start_time
          ? moment.utc(staffSchedule.start_time).local().format('YYYY-MM-DDTHH:mm')
          : '',
        end_time: staffSchedule.end_time
          ? moment.utc(staffSchedule.end_time).local().format('YYYY-MM-DDTHH:mm')
          : '',
        event: staffSchedule.event || '',
        staff_id: staffSchedule.staff_id || '',
        is_staff_schedule: true,
        status: 'staff',
      });
    } else {
      setFormData({
        staff_id: '',
        event: '',
        start_time: '',
        end_time: '',
        is_staff_schedule: true,
        status: 'staff',
      });
    }
  }, [staffSchedule]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  
    let newErrors: { [key: string]: string } = {};
  
    if (!formData.staff_id) {
      newErrors.staff_id = 'スタッフを選択してください。';
    }
  
    if (!formData.start_time) {
      newErrors.start_time = '開始時間を入力してください。';
    }
  
    if (!formData.end_time) {
      newErrors.end_time = '終了時間を入力してください。';
    }
  
    if (formData.start_time && formData.end_time) {
      const start = moment(formData.start_time);
      const end = moment(formData.end_time);
      if (!end.isAfter(start)) {
        newErrors.end_time = '終了時間は開始時間より後に設定してください。';
      }
    }
  
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    } else {
      setErrors({});
    }
  
    const updatedSchedule = {
      ...formData,
      event: formData.event || '予定あり',
      is_staff_schedule: true,
      status: 'staff',
      // UTCへの変換を避ける
      start_time: formData.start_time,
      end_time: formData.end_time,
    };
    
  
    console.log('Updated Schedule:', updatedSchedule); // ここで確認
  
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
            {/* スタッフ選択 */}
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
              {errors.staff_id && <p className="text-red-500 text-sm">{errors.staff_id}</p>}
            </div>

            {/* イベント選択 */}
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
              {/* イベントが未入力でもエラーを表示しない */}
            </div>

            {/* 開始時間 */}
            <div className="space-y-2">
              <Label htmlFor="start_time">開始時間</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time || ''}
                onChange={(e) => handleChange('start_time', e.target.value)}
                required
              />
              {errors.start_time && <p className="text-red-500 text-sm">{errors.start_time}</p>}
            </div>

            {/* 終了時間 */}
            <div className="space-y-2">
              <Label htmlFor="end_time">終了時間</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time || ''}
                onChange={(e) => handleChange('end_time', e.target.value)}
                required
              />
              {errors.end_time && <p className="text-red-500 text-sm">{errors.end_time}</p>}
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
