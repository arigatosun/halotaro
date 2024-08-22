import { Staff, DBStaffShift } from '@/sections/Dashboard/reservation/staff-shifts/types';

export async function getStaffShifts(staffId: string, year: number, month: number): Promise<DBStaffShift[]> {
  const response = await fetch(`/api/staff-shifts?staffId=${staffId}&year=${year}&month=${month}`);
  if (!response.ok) {
    throw new Error('Failed to fetch staff shifts');
  }
  return response.json();
}

export async function getStaffs(): Promise<Staff[]> {
  const response = await fetch('/api/staffs');
  if (!response.ok) {
    throw new Error('Failed to fetch staffs');
  }
  return response.json();
}

export async function upsertStaffShift(shift: Omit<DBStaffShift, 'id'>): Promise<DBStaffShift> {
  const response = await fetch('/api/staff-shifts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(shift),
  });
  if (!response.ok) {
    throw new Error('Failed to upsert staff shift');
  }
  return response.json();
}

export async function deleteStaffShift(id: string): Promise<void> {
  const response = await fetch(`/api/staff-shifts?id=${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete staff shift');
  }
}

export async function getSalonBusinessHours(year: number, month: number): Promise<{ date: string; is_holiday: boolean }[]> {
  const response = await fetch(`/api/salon-business-hours?year=${year}&month=${month}`);
  if (!response.ok) {
    throw new Error('Failed to fetch salon business hours');
  }
  const { data } = await response.json();
  return data;
}