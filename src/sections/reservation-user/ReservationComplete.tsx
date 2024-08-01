import React from "react";
import { Typography, Button } from "@mui/material";
import { useReservation } from "@/contexts/reservationcontext";

const ReservationComplete: React.FC = () => {
  const {
    selectedMenus,
    selectedDate,
    selectedTime,
    selectedStaff,
    customerInfo,
  } = useReservation();

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        予約が完了しました
      </Typography>
      <Typography variant="body1" paragraph>
        ご予約ありがとうございます。以下の内容で予約を承りました。
      </Typography>
      <Typography variant="body1">
        予約日時: {selectedDate?.toLocaleDateString()} {selectedTime}
      </Typography>
      <Typography variant="body1">担当スタッフ: {selectedStaff}</Typography>
      <Typography variant="body1">お客様名: {customerInfo.name}</Typography>
      <Typography variant="body1" paragraph>
        選択したメニュー: {selectedMenus.join(", ")}
      </Typography>
      <Typography variant="body1" paragraph>
        予約の詳細は、ご登録いただいたメールアドレス ({customerInfo.email})
        に送信されます。
      </Typography>
      <Button variant="contained" color="primary" href="/">
        トップページに戻る
      </Button>
    </div>
  );
};

export default ReservationComplete;
