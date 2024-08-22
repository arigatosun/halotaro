import { Moment } from 'moment';

export type ShiftType = '出' | '休' | '店休' | '';

export interface DBStaffShift {
  id: string;
  staff_id: string;
  date: string;
  shift_status: '出勤' | '休日';
  start_time: string | null;
  end_time: string | null;
  memo: string | null;  // null を許可
}


export interface ShiftData {
  type: string;
  startTime?: string | null;
  endTime?: string | null;
  memo?: string | null;
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