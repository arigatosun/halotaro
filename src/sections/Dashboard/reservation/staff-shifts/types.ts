import { Moment } from 'moment';

export type ShiftType = '出' | '休' | '店休' | '';

export interface ShiftData {
    type: string;
    startTime?: string;
    endTime?: string;
  }

export interface Staff {
  id: number;
  name: string;
  shifts: ShiftData[];
}

export type StaffShift = Pick<Staff, 'id' | 'name'> & {
  shifts: Array<ShiftData>;
};

export interface ShiftPopoverData {
  visible: boolean;
  anchorEl: HTMLButtonElement | null;
  date: Moment | null;
  staffName: string;
  currentShift: ShiftData | null;
}

export interface ShiftTableProps {
  staffShifts: StaffShift[];
  currentDate: Moment;
  onShiftUpdate: (staffId: number, dateIndex: number, newShift: ShiftData) => void;
}

export interface ShiftCellProps {
  shift: ShiftData;
  staffId: number;
  dateIndex: number;
  onShiftUpdate: (staffId: number, dateIndex: number, newShift: ShiftData) => void;
}

export interface ShiftPopoverProps {
  currentShift: ShiftData;
  onSubmit: (newShift: ShiftData) => void;
  onClose: () => void;
}