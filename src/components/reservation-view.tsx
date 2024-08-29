// src/app/actions/reservationActions.ts
'use server'

export interface Reservation {
  id: string
  time: string
  client: string
  service: string
  staff: string
  date: string
}

// サンプルデータ
const sampleReservations: Reservation[] = [
  { id: '1', date: '2024-08-22', time: '10:00', client: '山田花子', service: 'カット', staff: '斉藤 恵司' },
  { id: '2', date: '2024-08-22', time: '14:00', client: '鈴木一郎', service: 'カラー', staff: '徳 美加' },
  { id: '3', date: '2024-08-22', time: '16:00', client: '佐藤美咲', service: 'パーマ', staff: '田原 誠基' },
];

export async function getReservations(date: string, staff?: string): Promise<Reservation[]> {
  // サンプルデータをフィルタリングして返す
  return sampleReservations.filter(reservation => 
    reservation.date === date && (!staff || staff === 'all' || reservation.staff === staff)
  );
}

export async function addReservation(reservation: Omit<Reservation, 'id'>): Promise<Reservation> {
  const newReservation: Reservation = {
    ...reservation,
    id: (sampleReservations.length + 1).toString()
  };
  sampleReservations.push(newReservation);
  return newReservation;
}

export async function updateReservation(id: string, reservation: Partial<Reservation>): Promise<Reservation> {
  const index = sampleReservations.findIndex(r => r.id === id);
  if (index !== -1) {
    sampleReservations[index] = { ...sampleReservations[index], ...reservation };
    return sampleReservations[index];
  }
  throw new Error('Reservation not found');
}

export async function deleteReservation(id: string): Promise<void> {
  const index = sampleReservations.findIndex(r => r.id === id);
  if (index !== -1) {
    sampleReservations.splice(index, 1);
  } else {
    throw new Error('Reservation not found');
  }
}