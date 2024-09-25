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
  const [formData, setFormData] = useState<Partial<Reservation>>({});
 
  useEffect(() => {
    if (reservation) {
      setFormData({
        ...reservation,
        start_time: moment.utc(reservation.start_time).local().format('YYYY-MM-DDTHH:mm'),
        end_time: moment.utc(reservation.end_time).local().format('YYYY-MM-DDTHH:mm'),
      });
    } else {
      setFormData({});
    }
  }, [reservation]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMenu = menuList.find(menu => menu.id === formData.menu_id);
    const updatedReservation = {
      ...formData,
      start_time: moment(formData.start_time).utc().format(),
      end_time: moment(formData.end_time).utc().format(),
      total_price: selectedMenu ? selectedMenu.price : 0,
    };
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
            {isNew && (
              <>
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
                  <Label htmlFor="customer_email">メールアドレス</Label>
                  <Input
                    id="customer_email"
                    name="customer_email"
                    type="email"
                    value={formData.customer_email || ''}
                    onChange={(e) => handleChange('customer_email', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_phone">電話番号</Label>
                  <Input
                    id="customer_phone"
                    name="customer_phone"
                    type="tel"
                    value={formData.customer_phone || ''}
                    onChange={(e) => handleChange('customer_phone', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_name_kana">顧客名（カナ）</Label>
                  <Input
                    id="customer_name_kana"
                    name="customer_name_kana"
                    value={formData.customer_name_kana || ''}
                    onChange={(e) => handleChange('customer_name_kana', e.target.value)}
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

                <div>
        <label htmlFor="menu_id">メニュー</label>
        <Select
          value={formData.menu_id || ''}
          onValueChange={(value) => handleChange('menu_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="メニューを選択" />
          </SelectTrigger>
          <SelectContent>
            {menuList.map((menu) => (
              <SelectItem key={menu.id} value={menu.id}>
                {menu.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
              </>
            )}

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