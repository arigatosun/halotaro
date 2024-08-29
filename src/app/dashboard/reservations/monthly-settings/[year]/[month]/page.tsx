'use client'

import { useParams } from 'next/navigation';
import MonthlyReceptionSettingsDetail from "@/sections/Dashboard/reservation/monthly-settings/month/monthly-setting-view";

export default function MonthlySettings() {
  const params = useParams();
  const year = params.year as string;
  const month = params.month as string;

  return <MonthlyReceptionSettingsDetail year={year} month={month} />;
}