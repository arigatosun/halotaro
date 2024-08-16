export const formatDateTime = (dateTime: Date | null): string => {
  if (!dateTime) return "日時未選択";
  return dateTime.toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
  });
};
