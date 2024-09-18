import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OperatingHourData {
  date: string;
  is_holiday: boolean;
  open_time: string | null;
  close_time: string | null;
}

interface OperatingHoursByDate {
  [date: string]: {
    isHoliday: boolean;
    openTime: string | null;
    closeTime: string | null;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const salonId = searchParams.get('salonId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!salonId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('salon_business_hours')
      .select('date, is_holiday, open_time, close_time')
      .eq('salon_id', salonId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    const operatingHours = (data as OperatingHourData[]).reduce((acc: OperatingHoursByDate, day) => {
      acc[day.date] = {
        isHoliday: day.is_holiday,
        openTime: day.open_time,
        closeTime: day.close_time
      };
      return acc;
    }, {});

    return NextResponse.json({ success: true, data: operatingHours });
  } catch (error) {
    console.error('Error fetching salon operating hours:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch salon operating hours' }, { status: 500 });
  }
}