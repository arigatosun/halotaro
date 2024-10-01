import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  // フォームデータの状態
  const [formData, setFormData] = useState<Partial<Reservation>>({});

  // 予約データが変更されたときにフォームデータを更新
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

  // フォーム入力値の変更ハンドラ
  const handleChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // フォーム送信ハンドラ
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMenu = menuList.find(menu => menu.id === formData.menu_id);
    const updatedReservation = {
      ...formData,
      start_time: moment(formData.start_time).utc().format(),
      end_time: moment(formData.end_time).utc().format(),
      total_price: formData.is_staff_schedule ? 0 : (selectedMenu ? selectedMenu.price : 0),
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
            {/* スタッフスケジュールチェックボックス */}
            <div className="space-y-2">
              <Label htmlFor="is_staff_schedule">スタッフスケジュール</Label>
              <Checkbox
                id="is_staff_schedule"
                checked={formData.is_staff_schedule || false}
                onCheckedChange={(checked) => handleChange('is_staff_schedule', checked)}
              />
            </div>

            {/* スタッフスケジュールの場合のイベント選択 */}
            {formData.is_staff_schedule && (
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
            )}

            {/* 通常の予約の場合の顧客情報入力 */}
            {!formData.is_staff_schedule && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="customer_name">顧客名</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name || ''}
                    onChange={(e) => handleChange('customer_name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_email">メールアドレス</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email || ''}
                    onChange={(e) => handleChange('customer_email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_phone">電話番号</Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    value={formData.customer_phone || ''}
                    onChange={(e) => handleChange('customer_phone', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menu_id">メニュー</Label>
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

            {/* スタッフ選択 */}
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