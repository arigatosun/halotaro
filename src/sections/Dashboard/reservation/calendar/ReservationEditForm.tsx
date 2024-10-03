import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Reservation, Staff, MenuItem as MenuItemType } from '@/types/reservation';
import moment from 'moment';
import { Alert, Snackbar, Grid, Paper, Typography, Box } from '@mui/material';

interface ReservationEditFormProps {
  reservation: Reservation;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>) => void;
  onDelete: (id: string) => void;
  staffList: Staff[];
  menuList: MenuItemType[];
  reservations: Reservation[];
}

const ReservationEditForm: React.FC<ReservationEditFormProps> = ({
  reservation,
  onClose,
  onSubmit,
  onDelete,
  staffList,
  menuList,
  reservations
}) => {
  const [editingFormData, setEditingFormData] = useState<Partial<Reservation>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isOverlap, setIsOverlap] = useState<boolean>(false);
  const [overlapMessage, setOverlapMessage] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    if (reservation) {
      setEditingFormData({
        ...reservation,
        start_time: moment.utc(reservation.start_time).local().format('YYYY-MM-DDTHH:mm'),
        end_time: moment.utc(reservation.end_time).local().format('YYYY-MM-DDTHH:mm'),
      });
      setSelectedDate(moment.utc(reservation.start_time).local().format('YYYY-MM-DD'));
      setSelectedTime(moment.utc(reservation.start_time).local().format('HH:mm'));
    }
  }, [reservation]);

  useEffect(() => {
    if (selectedDate && editingFormData.staff_id && editingFormData.menu_id) {
      generateAvailableTimeSlots();
    }
  }, [selectedDate, editingFormData.staff_id, editingFormData.menu_id]);

  const generateAvailableTimeSlots = () => {
    const selectedMenu = menuList.find(menu => menu.id === editingFormData.menu_id);
    if (!selectedMenu) return;

    const dayStart = moment(selectedDate).startOf('day');
    const dayEnd = moment(selectedDate).endOf('day');
    const slots = [];

    for (let m = moment(dayStart); m.isBefore(dayEnd); m.add(30, 'minutes')) {
      const slotStart = m.format('HH:mm');
      const slotEnd = m.clone().add(selectedMenu.duration, 'minutes');

      if (slotEnd.isSameOrBefore(dayEnd) && !isSlotOverlapping(m, slotEnd)) {
        slots.push(slotStart);
      }
    }

    setAvailableTimeSlots(slots);
  };

  const isSlotOverlapping = (start: moment.Moment, end: moment.Moment) => {
    return reservations.some(res => {
      if (res.id === editingFormData.id) return false;
      if (res.staff_id !== editingFormData.staff_id) return false;
      const resStart = moment.utc(res.start_time).local();
      const resEnd = moment.utc(res.end_time).local();
      return start.isBefore(resEnd) && end.isAfter(resStart);
    });
  };

  const handleChange = (name: string, value: string | boolean) => {
    setEditingFormData(prev => ({
      ...prev,
      [name]: name === 'menu_id' ? parseInt(value as string, 10) : value,
    }));
    if (name === 'staff_id' || name === 'menu_id') {
      setIsOverlap(false);
      setOverlapMessage('');
      setSelectedTime(null);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setIsOverlap(false);
    setOverlapMessage('');
    setSelectedTime(null);
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOverlap) {
      setSnackbar({ message: overlapMessage, severity: 'error' });
      return;
    }

    if (!selectedTime) {
      setSnackbar({ message: '予約時間を選択してください。', severity: 'error' });
      return;
    }

    const selectedMenu = menuList.find(menu => menu.id === editingFormData.menu_id);
    if (!selectedMenu) {
      setSnackbar({ message: 'メニューを選択してください。', severity: 'error' });
      return;
    }

    const startDateTime = moment(`${selectedDate}T${selectedTime}`);
    const endDateTime = startDateTime.clone().add(selectedMenu.duration, 'minutes');

    const updatedReservation = {
      ...editingFormData,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      total_price: selectedMenu.price || 0,
    };

    try {
      await onSubmit(updatedReservation);
      onClose();
    } catch (error) {
      console.error('EditForm: Error submitting form', error);
      setSnackbar({ message: '予約の更新に失敗しました', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (window.confirm('この予約をキャンセルしますか？')) {
      if (editingFormData.id) {
        await onDelete(editingFormData.id);
        onClose();
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>予約の編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">顧客名</Label>
                  <Input
                    id="customer_name"
                    value={editingFormData.customer_name || ''}
                    onChange={(e) => handleChange('customer_name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_email">メールアドレス</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={editingFormData.customer_email || ''}
                    onChange={(e) => handleChange('customer_email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_phone">電話番号</Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    value={editingFormData.customer_phone || ''}
                    onChange={(e) => handleChange('customer_phone', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menu_id">メニュー</Label>
                  <Select
                    value={editingFormData.menu_id ? editingFormData.menu_id.toString() : ''}
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

                <div className="space-y-2">
                  <Label htmlFor="staff_id">担当スタッフ</Label>
                  <Select
                    value={editingFormData.staff_id || ''}
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
              </div>
            </Box>

            <Box sx={{ flex: 1 }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reservation_date">予約日</Label>
                  <Input
                    id="reservation_date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    required
                  />
                </div>

                {selectedDate && editingFormData.staff_id && editingFormData.menu_id && (
                  <div className="space-y-2">
                    <Label>予約時間</Label>
                    <Paper style={{ maxHeight: 200, overflow: 'auto', padding: '10px' }}>
                      <Grid container spacing={1}>
                        {availableTimeSlots.length > 0 ? (
                          availableTimeSlots.map((time) => (
                            <Grid item xs={4} key={time}>
                              <Button
                                type="button"
                                onClick={() => handleTimeChange(time)}
                                variant={selectedTime === time ? 'default' : 'outline'}
                              >
                                {time}
                              </Button>
                            </Grid>
                          ))
                        ) : (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="textSecondary">
                              利用可能な時間枠がありません。
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Paper>
                  </div>
                )}

                {selectedTime && (
                  <Typography variant="body2">
                    予約時間: {selectedTime} - {moment(`${selectedDate}T${selectedTime}`).add(menuList.find(menu => menu.id === editingFormData.menu_id)?.duration || 0, 'minutes').format('HH:mm')}
                  </Typography>
                )}

                {isOverlap && (
                  <Alert severity="error">
                    {overlapMessage}
                  </Alert>
                )}
              </div>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button type="submit" disabled={isOverlap || !selectedTime}>
              予約を更新
            </Button>
          </Box>
        </form>
      </DialogContent>

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
    </Dialog>
  );
};

export default ReservationEditForm;