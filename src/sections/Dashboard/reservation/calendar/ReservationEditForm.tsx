import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogActions, DialogTitle, TextField, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Reservation, Staff, MenuItem as MenuItemType } from '@/types/reservation';
import moment from 'moment';

interface ReservationEditFormProps {
  reservation: Reservation;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>, isNew: boolean) => void;
  onDelete: (id: string) => Promise<void>;
  staffList: Staff[];
  menuList: MenuItemType[];
}

const ReservationEditForm: React.FC<ReservationEditFormProps> = ({
  reservation,
  onClose,
  onSubmit,
  onDelete,
  staffList,
  menuList
}) => {
  const [formData, setFormData] = useState<Partial<Reservation>>({});

  useEffect(() => {
    setFormData({
      ...reservation,
      start_time: moment.utc(reservation.start_time).local().format('YYYY-MM-DDTHH:mm'),
      end_time: moment.utc(reservation.end_time).local().format('YYYY-MM-DDTHH:mm'),
    });
  }, [reservation]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const selectedMenu = menuList.find(menu => menu.id === formData.menu_id);
    const updatedReservation = {
      ...formData,
      start_time: moment(formData.start_time).utc().format(),
      end_time: moment(formData.end_time).utc().format(),
    };
    onSubmit(updatedReservation, false);
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('この予約をキャンセルしますか？')) {
      await onDelete(reservation.id);
      onClose();
    }
  };

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogTitle>予約の編集</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel id="staff-select-label">担当スタッフ</InputLabel>
          <Select
            labelId="staff-select-label"
            value={formData.staff_id || ''}
            onChange={(e) => handleChange('staff_id', e.target.value as string)}
            label="担当スタッフ"
          >
            {staffList.map((staff) => (
              <MenuItem key={staff.id} value={staff.id}>{staff.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="開始時間"
          type="datetime-local"
          value={formData.start_time || ''}
          onChange={(e) => handleChange('start_time', e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="終了時間"
          type="datetime-local"
          value={formData.end_time || ''}
          onChange={(e) => handleChange('end_time', e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDelete} color="error">キャンセル</Button>
        <Button onClick={onClose}>閉じる</Button>
        <Button onClick={handleSubmit} color="primary">更新</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReservationEditForm;