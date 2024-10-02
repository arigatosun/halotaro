// src/sections/Dashboard/reservation/calendar/ReservationForm.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Reservation, Staff, MenuItem as MenuItemType } from '@/types/reservation';
import moment from 'moment';
import { Alert, Snackbar } from '@mui/material';

interface ReservationFormProps {
  reservation: Partial<Reservation> | null;
  isNew: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>, isNew: boolean) => void;
  onDelete: (id: string) => void;
  staffList: Staff[];
  menuList: MenuItemType[];
  reservations: Reservation[];
}

const ReservationForm: React.FC<ReservationFormProps> = ({
  reservation,
  isNew,
  onClose,
  onSubmit,
  onDelete,
  staffList,
  menuList,
  reservations
}) => {
  const [formType, setFormType] = useState<'reservation' | 'staffSchedule'>(
    reservation?.is_staff_schedule ? 'staffSchedule' : 'reservation'
  );
  const [formData, setFormData] = useState<Partial<Reservation>>({});
  const [computedEndTime, setComputedEndTime] = useState<string>('');
  const [isOverlap, setIsOverlap] = useState<boolean>(false);
  const [overlapMessage, setOverlapMessage] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (reservation) {
      setFormData({
        ...reservation,
        start_time: reservation.start_time ? moment.utc(reservation.start_time).local().format('YYYY-MM-DDTHH:mm') : '',
        end_time: reservation.end_time ? moment.utc(reservation.end_time).local().format('YYYY-MM-DDTHH:mm') : '',
      });
      setComputedEndTime('');
      setIsOverlap(false);
      setOverlapMessage('');
    } else {
      setFormData({});
      setComputedEndTime('');
      setIsOverlap(false);
      setOverlapMessage('');
    }
  }, [reservation]);

  const handleChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (formType === 'reservation' && formData.menu_id && formData.start_time) {
      const selectedMenu = menuList.find(menu => menu.id === formData.menu_id);
      if (selectedMenu) {
        const start = moment(formData.start_time);
        const end = moment(start).add(selectedMenu.duration, 'minutes');
        const formattedEnd = end.format('YYYY-MM-DDTHH:mm');

        if (formattedEnd !== computedEndTime) {
          setComputedEndTime(formattedEnd);
        }

        const overlapping = reservations.some(res => {
          if (res.id === formData.id) return false;
          if (res.status === 'cancelled' || res.status === 'completed') return false;
          if (res.staff_id !== formData.staff_id) return false;

          const existingStart = moment.utc(res.start_time);
          const existingEnd = moment.utc(res.end_time);
          return start.isBefore(existingEnd) && end.isAfter(existingStart);
        });

        if (overlapping) {
          if (!isOverlap) {
            setIsOverlap(true);
            setOverlapMessage('選択した時間帯は既に予約が入っています。別の時間を選択してください。');
          }
        } else {
          if (isOverlap) {
            setIsOverlap(false);
            setOverlapMessage('');
          }
        }
      }
    } else {
      if (computedEndTime !== '') {
        setComputedEndTime('');
      }
      if (isOverlap) {
        setIsOverlap(false);
        setOverlapMessage('');
      }
    }
  }, [formData.menu_id, formData.start_time, formData.staff_id, menuList, reservations, formData.id, formType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formType === 'reservation' && isOverlap) {
      setSnackbar({ message: overlapMessage, severity: 'error' });
      return;
    }

    let updatedReservation: Partial<Reservation>;

    if (formType === 'reservation') {
      const selectedMenu = menuList.find(menu => menu.id === formData.menu_id);
      updatedReservation = {
        ...formData,
        start_time: formData.start_time ? moment(formData.start_time).utc().format() : '',
        end_time: computedEndTime ? moment(computedEndTime).utc().format() : '',
        total_price: selectedMenu ? selectedMenu.price : 0,
        is_staff_schedule: false,
      };
    } else {
      updatedReservation = {
        ...formData,
        start_time: formData.start_time ? moment(formData.start_time).utc().format() : '',
        end_time: formData.end_time ? moment(formData.end_time).utc().format() : '',
        is_staff_schedule: true,
        total_price: 0,
      };
    }

    onSubmit(updatedReservation, isNew);
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('この予約をキャンセルしますか？')) {
      if (formData.id) {
        await onDelete(formData.id);
        onClose();
      }
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isNew ? '新規予約' : '予約の編集'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-type">予約タイプ</Label>
                <Select
                  value={formType}
                  onValueChange={(value: 'reservation' | 'staffSchedule') => setFormType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="予約タイプを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reservation">通常の予約</SelectItem>
                    <SelectItem value="staffSchedule">スタッフスケジュール</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formType === 'reservation' ? (
                // 通常の予約フォーム
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
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="メニューを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {menuList.map((menu) => (
                          <SelectItem key={menu.id} value={menu.id}>
                            {menu.name} ({menu.duration}分)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="staff_id">担当スタッフ</Label>
                    <Select
                      value={formData.staff_id || ''}
                      onValueChange={(value) => handleChange('staff_id', value)}
                      required
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
                    <Label>開始時間</Label>
                    <Input
                      type="text"
                      value={formData.start_time ? moment(formData.start_time).format('YYYY/MM/DD HH:mm') : ''}
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>終了時間</Label>
                    <Input
                      type="text"
                      value={computedEndTime ? moment(computedEndTime).format('YYYY/MM/DD HH:mm') : ''}
                      readOnly
                    />
                  </div>

                  {isOverlap && (
                    <Alert severity="error">
                      {overlapMessage}
                    </Alert>
                  )}
                </>
              ) : (
                // スタッフスケジュールフォーム
                <>
                  <div className="space-y-2">
                    <Label htmlFor="staff_id">スタッフ</Label>
                    <Select
                      value={formData.staff_id || ''}
                      onValueChange={(value) => handleChange('staff_id', value)}
                      required
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
                      required
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
                </>
              )}
            </div>
            <div className="flex justify-between mt-6">
            <Button type="submit" disabled={formType === 'reservation' && isOverlap}>
                {isNew ? '予約を作成' : '予約を更新'}
              </Button>
              {!isNew && formData.id && (
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  予約を削除
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(null)} 
          severity={snackbar?.severity} 
          sx={{ 
            width: '100%',
            borderRadius: '8px',
            boxShadow: 3,
          }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ReservationForm;