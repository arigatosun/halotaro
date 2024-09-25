import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Reservation, Staff, MenuItem } from '@/types/reservation';

interface ReservationFormProps {
  reservation: Partial<Reservation> | null;
  isNew: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>) => void;
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
    const [formData, setFormData] = useState<Partial<Reservation>>(reservation || {});

  useEffect(() => {
    if (reservation) {
      // 既存の予約データがある場合、日時をフォーマットして設定
      const startTime = formatDateTimeForInput(reservation.start_time);
      const endTime = formatDateTimeForInput(reservation.end_time);
      setFormData({ ...reservation, start_time: startTime, end_time: endTime });
    } else {
      setFormData({});
    }
  }, [reservation]);

  const formatDateTimeForInput = (dateTimeString: string | undefined) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm" 形式に変換
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isNew ? '新規予約' : '予約時間の編集'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {isNew ? (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">顧客名</Label>
                  <Input
                    id="customer_name"
                    name="customer_name"
                    value={formData.customer_name || ''}
                    onChange={(e) => handleChange('customer_name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menu_id">メニュー</Label>
                  <Select
                    onValueChange={(value) => handleChange('menu_id', value)}
                    value={formData.menu_id}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="メニューを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuList.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id}>{menu.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staff_id">担当スタッフ</Label>
                  <Select
                    onValueChange={(value) => handleChange('staff_id', value)}
                    value={formData.staff_id}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="スタッフを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : null}

          <div className="space-y-4 mt-4">
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
          </div>

          <div className="flex justify-between mt-6">
            <Button type="submit">{isNew ? '予約を作成' : '時間を更新'}</Button>
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