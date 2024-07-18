import MonthlyReceptionSettingsDetail from "@/sections/Dashboard/reservation/monthly-settings/month/monthly-setting-view";

export default function monthlysettings() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, "0");

  return (
    <MonthlyReceptionSettingsDetail year={currentYear} month={currentMonth} />
  );
}
