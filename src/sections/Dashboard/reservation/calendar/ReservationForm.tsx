import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Reservation, Staff, MenuItem } from '@/types/reservation';
import moment from 'moment';

interface ReservationFormProps {
  reservation: Partial<Reservation> | null;
  isNew: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>, isNew: boolean) => void;
  onDelete: (id: string) => void;
  staffList: Staff[];
  menuList: MenuItem[];
}

const ReservationForm: React.FC<ReservationFormProps> = ({
  reservation,
  isNew,
  onClose,
  onSubmit,
  onDelete,
  staffList,
  menuList
}) => {
  console.log('ReservationForm props:', { reservation, isNew, staffList, menuList });

  const [formData, setFormData] = useState<Partial<Reservation>>({});

  useEffect(() => {
    if (reservation) {
      const formattedReservation = {
        ...reservation,
        start_time: moment.utc(reservation.start_time).local().format('YYYY-MM-DDTHH:mm'),
        end_time: moment.utc(reservation.end_time).local().format('YYYY-MM-DDTHH:mm'),
      };
      console.log('Setting form data:', formattedReservation);
      setFormData(formattedReservation);
    } else {
      setFormData({});
    }
  }, [reservation]);

  const handleChange = (name: string, value: string) => {
    console.log('Form field changed:', { name, value });
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { customer_name, menu_name, staff_name, ...dataToUpdate } = formData;
    const updatedReservation = {
      ...dataToUpdate,
      start_time: moment(formData.start_time).utc().format(),
      end_time: moment(formData.end_time).utc().format(),
    };
    console.log('Submitting form with data:', updatedReservation);
    onSubmit(updatedReservation, isNew);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isNew ? '新規予約' : '予約の編集'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">開始時間</Label>
              <Input
                id="start_time"
                type="datetime-local"
                name="start_time"
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
                name="end_time"
                value={formData.end_time || ''}
                onChange={(e) => handleChange('end_time', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_id">担当スタッフ</Label>
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

            {/* 必要に応じて他のフィールドを追加 */}
          </div>
          <div className="flex justify-between mt-6">
            <Button type="submit">{isNew ? '予約を作成' : '予約を更新'}</Button>
            {!isNew && formData.id && (
              <Button type="button" variant="destructive" onClick={() => onDelete(formData.id!)}>
                予約を削除
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationForm;