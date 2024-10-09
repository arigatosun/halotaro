// src/components/AddTypeModal.tsx

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AddTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'reservation' | 'staffSchedule') => void;
}

const AddTypeModal: React.FC<AddTypeModalProps> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>追加タイプを選択</DialogTitle>
        </DialogHeader>
        <div className="flex justify-around mt-4">
          <Button onClick={() => { onSelect('reservation'); onClose(); }}>
            予約を追加
          </Button>
          <Button onClick={() => { onSelect('staffSchedule'); onClose(); }}>
            スタッフスケジュールを追加
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTypeModal;
