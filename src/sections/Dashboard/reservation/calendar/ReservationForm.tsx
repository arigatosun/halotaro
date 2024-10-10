// src/sections/Dashboard/reservation/calendar/ReservationForm.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BusinessHour, Reservation, Staff, MenuItem as MenuItemType } from '@/types/reservation';
import moment from 'moment';
import { Alert, Snackbar } from '@mui/material';

interface FormDataType {
  customer_first_name?: string;
  customer_last_name?: string;
  customer_first_name_kana?: string;
  customer_last_name_kana?: string;
  customer_email?: string;
  customer_phone?: string;
  menu_id?: number; // 型を number に変更
  staff_id?: string;
  start_time?: string;
  end_time?: string;
  event?: string;
  id?: string;
}

interface ReservationFormProps {
  reservation: Partial<Reservation> | null;
  isNew: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>, isNew: boolean) => void;
  onDelete: (id: string) => void;
  staffList: Staff[];
  menuList: MenuItemType[];
  reservations: Reservation[];
  hideReservationType?: boolean;
  isCreatingFromButton?: boolean;
  businessHours: BusinessHour[];
}

const ReservationForm: React.FC<ReservationFormProps> = ({
  reservation,
  isNew,
  onClose,
  onSubmit,
  onDelete,
  staffList,
  menuList,
  reservations,
  businessHours,
  hideReservationType = false,
  isCreatingFromButton = false,
}) => {
  const [formType, setFormType] = useState<'reservation' | 'staffSchedule'>('reservation');
  const [formData, setFormData] = useState<FormDataType>({});
  const [computedEndTime, setComputedEndTime] = useState<string>('');
  const [isOverlap, setIsOverlap] = useState<boolean>(false);
  const [overlapMessage, setOverlapMessage] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedMenuPrice, setSelectedMenuPrice] = useState<number>(0);

  useEffect(() => {
    if (reservation && !isCreatingFromButton) {
      // フルネームを姓と名に分割
      const nameParts = (reservation.customer_name || '').split(' ');
      const lastName = nameParts[0] || '';
      const firstName = nameParts[1] || '';

      const nameKanaParts = (reservation.customer_name_kana || '').split(' ');
      const lastNameKana = nameKanaParts[0] || '';
      const firstNameKana = nameKanaParts[1] || '';

      setFormData({
        ...reservation,
        customer_last_name: lastName,
        customer_first_name: firstName,
        customer_last_name_kana: lastNameKana,
        customer_first_name_kana: firstNameKana,
        menu_id: reservation.menu_id, // そのまま設定
        staff_id: reservation.staff_id,
      });

      if (reservation.start_time) {
        const startMoment = moment.utc(reservation.start_time).local();
        setSelectedDate(startMoment.toDate());
        setSelectedTimeSlot(startMoment.format('HH:mm'));
        if (reservation.menu_id) {
          const selectedMenu = menuList.find(menu => menu.id === reservation.menu_id); // 比較を修正
          if (selectedMenu) {
            const endMoment = startMoment.clone().add(selectedMenu.duration, 'minutes');
            setComputedEndTime(endMoment.format('YYYY-MM-DDTHH:mm'));
          }
        }
      }

      setIsOverlap(false);
      setOverlapMessage('');
    } else {
      // 新規予約の場合の初期化
      setFormData({});
      setSelectedDate(new Date());
      setSelectedTimeSlot(null);
      setComputedEndTime('');
      setIsOverlap(false);
      setOverlapMessage('');
    }
  }, [reservation, isCreatingFromButton, menuList]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: name === 'menu_id' ? (value ? Number(value) : undefined) : value,
    }));
  };

  useEffect(() => {
    if (formData.menu_id) {
      const selectedMenu = menuList.find(menu => menu.id === formData.menu_id);
      if (selectedMenu) {
        setSelectedMenuPrice(selectedMenu.price);
      } else {
        setSelectedMenuPrice(0);
      }
    } else {
      setSelectedMenuPrice(0);
    }
  }, [formData.menu_id, menuList]);

  useEffect(() => {
    if (selectedDate && formData.staff_id && formData.menu_id && formType === 'reservation') {
      const selectedMenu = menuList.find(menu => menu.id === formData.menu_id);
      if (selectedMenu) {
        const menuDuration = selectedMenu.duration;
        const staffId = formData.staff_id;
        const dateStr = moment(selectedDate).format('YYYY-MM-DD');

        let businessHourForDate = businessHours.find(bh => bh.date === dateStr);
        if (!businessHourForDate) {
          // デフォルトの営業時間を使用
          const isWeekend = [0, 6].includes(moment(dateStr).day());
          businessHourForDate = {
            date: dateStr,
            open_time: isWeekend ? '10:00:00' : '09:00:00',
            close_time: isWeekend ? '18:00:00' : '20:00:00',
            is_holiday: false
          };
        }

        if (businessHourForDate.is_holiday) {
          setAvailableTimes([]);
          return;
        }

        const openingTime = moment(`${dateStr} ${businessHourForDate.open_time}`, 'YYYY-MM-DD HH:mm:ss');
        const closingTime = moment(`${dateStr} ${businessHourForDate.close_time}`, 'YYYY-MM-DD HH:mm:ss');

        const timeSlots = [];
        let currentTime = openingTime.clone();
        while (currentTime.isBefore(closingTime)) {
          timeSlots.push(currentTime.format('HH:mm'));
          currentTime.add(30, 'minutes');
        }

        const available: string[] = [];

        timeSlots.forEach(time => {
          const start = moment(`${dateStr} ${time}`, 'YYYY-MM-DD HH:mm');
          const end = start.clone().add(menuDuration, 'minutes');

          if (end.isAfter(closingTime)) return;

          const overlapping = reservations.some(res => {
            if (res.staff_id !== staffId) return false;
            if (res.status === 'cancelled' || res.status === 'completed') return false;

            const resStart = moment.utc(res.start_time).local();
            const resEnd = moment.utc(res.end_time).local();

            return start.isBefore(resEnd) && end.isAfter(resStart);
          });

          if (!overlapping) {
            available.push(time);
          }
        });

        setAvailableTimes(available);
      }
    } else {
      setAvailableTimes([]);
    }
  }, [selectedDate, formData.staff_id, formData.menu_id, reservations, menuList, businessHours, formType]);

  useEffect(() => {
    if (selectedTimeSlot && selectedDate && formData.menu_id && formType === 'reservation') {
      const selectedMenu = menuList.find(menu => menu.id === formData.menu_id);
      if (selectedMenu) {
        const start = moment(`${moment(selectedDate).format('YYYY-MM-DD')}T${selectedTimeSlot}`);
        const end = start.clone().add(selectedMenu.duration, 'minutes');

        setFormData(prev => ({
          ...prev,
          start_time: start.format('YYYY-MM-DDTHH:mm'),
          end_time: end.format('YYYY-MM-DDTHH:mm'),
        }));

        setComputedEndTime(end.format('YYYY-MM-DDTHH:mm'));
      }
    }
  }, [selectedTimeSlot, selectedDate, formData.menu_id, menuList, formType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formType === 'reservation' && isOverlap) {
      setSnackbar({ message: overlapMessage, severity: 'error' });
      return;
    }

    // 姓名を結合
    const customer_name = `${formData.customer_last_name || ''} ${formData.customer_first_name || ''}`.trim();
    const customer_name_kana = `${formData.customer_last_name_kana || ''} ${formData.customer_first_name_kana || ''}`.trim();

    let updatedReservation: Partial<Reservation> = {
      ...formData,
      customer_name,
      customer_name_kana,
      start_time: formData.start_time ? moment(formData.start_time).utc().format() : undefined,
      // formTypeに応じてend_timeを設定
      end_time: formType === 'reservation'
        ? (computedEndTime ? moment(computedEndTime).utc().format() : undefined)
        : (formData.end_time ? moment(formData.end_time).utc().format() : undefined),
      total_price: formType === 'reservation' ? selectedMenuPrice : 0,
      is_staff_schedule: formType === 'staffSchedule',
    };

    // スタッフスケジュールの場合、顧客関連フィールドを除外
    if (formType === 'staffSchedule') {
      // 顧客関連フィールドは既に設定されていないため、特に追加の処理は不要
      // 今回の修正ではスプレッド演算子を使用しないため、不要なフィールドが含まれない
    }

    // デバッグ用ログ
    console.log('Updated Reservation:', updatedReservation);

    onSubmit(updatedReservation, isNew);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('この予約をキャンセルしますか？')) {
      if (formData.id) {
        onDelete(formData.id);
        onClose();
      }
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{isNew ? '新規予約' : '予約の編集'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {!hideReservationType && (
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
              )}
              {formType === 'reservation' ? (
                // Reservation form
                <> {/* スタッフの選択 */}
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


                  {/* 顧客名の入力 (姓) */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_last_name">顧客名（姓）</Label>
                    <Input
                      id="customer_last_name"
                      value={formData.customer_last_name || ''}
                      onChange={(e) => handleChange('customer_last_name', e.target.value)}
                      required
                    />
                  </div>

                  {/* 顧客名の入力 (名) */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_first_name">顧客名（名）</Label>
                    <Input
                      id="customer_first_name"
                      value={formData.customer_first_name || ''}
                      onChange={(e) => handleChange('customer_first_name', e.target.value)}
                      required
                    />
                  </div>

                  {/* 顧客名（カナ）の入力 (姓) */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_last_name_kana">顧客名（カナ・姓）</Label>
                    <Input
                      id="customer_last_name_kana"
                      value={formData.customer_last_name_kana || ''}
                      onChange={(e) => handleChange('customer_last_name_kana', e.target.value)}
                      required
                    />
                  </div>

                  {/* 顧客名（カナ）の入力 (名) */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_first_name_kana">顧客名（カナ・名）</Label>
                    <Input
                      id="customer_first_name_kana"
                      value={formData.customer_first_name_kana || ''}
                      onChange={(e) => handleChange('customer_first_name_kana', e.target.value)}
                      required
                    />
                  </div>

                  {/* メールアドレスの入力 */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">メールアドレス</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email || ''}
                      onChange={(e) => handleChange('customer_email', e.target.value)}
                      required
                    />
                  </div>

                  {/* 電話番号の入力 */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">電話番号</Label>
                    <Input
                      id="customer_phone"
                      type="tel"
                      value={formData.customer_phone || ''}
                      onChange={(e) => handleChange('customer_phone', e.target.value)}
                    />
                  </div>

                  {/* メニューの選択 */}
                  <div className="space-y-2">
                    <Label htmlFor="menu_id">メニュー</Label>
                    <Select
                      value={formData.menu_id?.toString() || ''} // 文字列に変換
                      onValueChange={(value) => handleChange('menu_id', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="メニューを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {menuList.map((menu) => (
                          <SelectItem key={menu.id} value={menu.id.toString()}>
                            {menu.name} ({menu.duration}分)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 選択したメニューの価格表示 */}
                  {selectedMenuPrice > 0 && (
                    <div className="space-y-2">
                      <Label>メニューの価格</Label>
                      <p>{selectedMenuPrice.toLocaleString()}円</p>
                    </div>
                  )}


                  {/* 日付の選択 */}
                  <div className="space-y-2">
                    <Label>予約日</Label>
                    <Input
                      type="date"
                      value={selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : ''}
                      onChange={(e) => setSelectedDate(moment(e.target.value).toDate())}
                      required
                    />
                  </div>

                  {/* 予約可能な時間帯の表示 */}
                  {availableTimes.length > 0 ? (
                    <div className="space-y-2">
                      <Label>予約可能な時間帯</Label>
                      <div className="grid grid-cols-4 gap-2 max-h-[calc(2.5rem*8+1.5rem)] overflow-y-auto">
                        {availableTimes.map((time) => (
                          <Button
                            type="button"
                            key={time}
                            variant={selectedTimeSlot === time ? 'default' : 'outline'}
                            onClick={() => setSelectedTimeSlot(time)}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : selectedDate && formData.staff_id && formData.menu_id ? (
                    <p>この日に予約可能な時間帯はありません。</p>
                  ) : null}
                  
                  {/* 選択した時間帯の表示 */}
                  {selectedTimeSlot && (
                    <div className="space-y-2">
                      <Label>選択した時間帯</Label>
                      <p>
                        {selectedTimeSlot} ~{' '}
                        {moment(`${selectedDate?.toISOString().split('T')[0]}T${selectedTimeSlot}`, 'YYYY-MM-DDTHH:mm')
                          .add(menuList.find(menu => menu.id === formData.menu_id)?.duration || 0, 'minutes')
                          .format('HH:mm')}
                      </p>
                    </div>
                  )}

                  {isOverlap && (
                    <Alert severity="error">
                      {overlapMessage}
                    </Alert>
                  )}
                </>
              ) : (
                // Staff Schedule Form
                <>
                  {/* スタッフの選択 */}
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

                  {/* イベントの選択 */}
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
                </>
              )}
            </div>
            <div className="flex justify-between mt-6">
              <Button
                type="submit"
                disabled={
                  formType === 'reservation' &&
                  (isOverlap || (!selectedTimeSlot))
                }
              >
                {isNew ? (formType === 'reservation' ? '予約を作成' : 'スタッフスケジュールを作成') : (formType === 'reservation' ? '予約を更新' : 'スタッフスケジュールを更新')}
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
