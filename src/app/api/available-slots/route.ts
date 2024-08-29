import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parse, format, addMinutes, isWithinInterval, isBefore, isAfter } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StaffShift {
  date: string;
  start_time: string;
  end_time: string;
}

interface BusinessHour {
  date: string;
  is_holiday: boolean;
  open_time: string;
  close_time: string;
}

interface Reservation {
  start_time: string;
  end_time: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!staffId || !startDate || !endDate) {
    return NextResponse.json({ error: '必要なパラメータが不足しています' }, { status: 400 });
  }

  console.log('Received parameters:', { staffId, startDate, endDate });

  try {
    // スタッフのサロンIDを取得
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('user_id')
      .eq('id', staffId)
      .single();

    if (staffError) {
      console.error('Staff data fetch error:', staffError);
      throw staffError;
    }

    console.log('Staff data:', staffData);

    // スタッフのシフトを取得
    const { data: staffShifts, error: shiftError } = await supabase
      .from('staff_shifts')
      .select('*')
      .eq('staff_id', staffId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (shiftError) {
      console.error('Staff shifts fetch error:', shiftError);
      throw shiftError;
    }

    console.log('Staff shifts:', staffShifts);

    // サロンの営業時間を取得
    const { data: businessHours, error: businessError } = await supabase
      .from('salon_business_hours')
      .select('*')
      .eq('salon_id', staffData.user_id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (businessError) {
      console.error('Business hours fetch error:', businessError);
      throw businessError;
    }

    console.log('Business hours:', businessHours);

    // 既存の予約を取得
    const { data: reservations, error: reservationError } = await supabase
      .from('reservations')
      .select('start_time, end_time')
      .eq('staff_id', staffId)
      .gte('start_time', startDate)
      .lte('end_time', endDate);

    if (reservationError) {
      console.error('Reservations fetch error:', reservationError);
      throw reservationError;
    }

    console.log('Reservations:', reservations);

    // 利用可能な時間枠を計算
    const availableSlots = calculateAvailableSlots(
      staffShifts as StaffShift[],
      businessHours as BusinessHour[],
      reservations as Reservation[]
    );

    console.log('Available slots:', availableSlots);

    return NextResponse.json({ success: true, availableSlots });
  } catch (error) {
    console.error('利用可能な時間枠の取得中にエラーが発生しました:', error);
    return NextResponse.json({ success: false, error: '利用可能な時間枠の取得中にエラーが発生しました' }, { status: 500 });
  }
}

function calculateAvailableSlots(staffShifts: StaffShift[], businessHours: BusinessHour[], reservations: Reservation[]) {
  const availableSlots: Record<string, string[]> = {};

  staffShifts.forEach(shift => {
    const date = shift.date;
    const businessHour = businessHours.find(bh => bh.date === date);

    if (businessHour && !businessHour.is_holiday) {
      const slots: string[] = [];

      // 日付と時間をDateオブジェクトに変換
      const shiftStart = parse(`${date} ${shift.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
      const shiftEnd = parse(`${date} ${shift.end_time}`, 'yyyy-MM-dd HH:mm', new Date());
      const businessStart = parse(`${date} ${businessHour.open_time}`, 'yyyy-MM-dd HH:mm', new Date());
      const businessEnd = parse(`${date} ${businessHour.close_time}`, 'yyyy-MM-dd HH:mm', new Date());

      // 実際の開始時間と終了時間を決定
      const startTime = isAfter(shiftStart, businessStart) ? shiftStart : businessStart;
      const endTime = isBefore(shiftEnd, businessEnd) ? shiftEnd : businessEnd;

      let currentTime = startTime;

      while (isBefore(currentTime, endTime)) {
        // クライアント側で使用する形式（HH:mm）に変換
        const timeString = format(currentTime, 'HH:mm');

        // 現在の時間枠が利用可能かチェック
        const isAvailable = !reservations.some(reservation => {
          const reservationStart = parse(reservation.start_time, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
          const reservationEnd = parse(reservation.end_time, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
          return isWithinInterval(currentTime, { start: reservationStart, end: reservationEnd });
        });

        if (isAvailable) {
          slots.push(timeString);
        }

        currentTime = addMinutes(currentTime, 30);
      }

      if (slots.length > 0) {
        availableSlots[date] = slots;
      }
    }
  });

  return availableSlots;
}