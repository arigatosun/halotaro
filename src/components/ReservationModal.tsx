// src/components/ReservationModal.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Reservation } from '@/app/actions/reservationActions';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Reservation>) => void;
  onDelete?: () => void;
  initialValues?: Partial<Reservation>;
  title: string;
}

const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialValues,
  title,
}) => {
  const [formData, setFormData] = React.useState<Partial<Reservation>>(initialValues || {});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                日付
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date || ''}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                時間
              </Label>
              <Input
                id="time"
                name="time"
                type="time"
                value={formData.time || ''}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                顧客名
              </Label>
              <Input
                id="client"
                name="client"
                value={formData.client || ''}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="service" className="text-right">
                サービス
              </Label>
              <Input
                id="service"
                name="service"
                value={formData.service || ''}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="staff" className="text-right">
                担当スタッフ
              </Label>
              <Input
                id="staff"
                name="staff"
                value={formData.staff || ''}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            {onDelete && (
              <Button type="button" variant="destructive" onClick={onDelete}>
                削除
              </Button>
            )}
            <Button type="submit">保存</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationModal;