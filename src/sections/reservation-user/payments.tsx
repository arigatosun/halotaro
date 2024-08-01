import React, { useState } from "react";
import { Typography, Button, TextField } from "@mui/material";
import { useReservation } from "@/contexts/reservationcontext";

interface PaymentProps {
  onNext: () => void;
  onBack: () => void;
}

const Payment: React.FC<PaymentProps> = ({ onNext, onBack }) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const { selectedMenus } = useReservation();

  // この部分は実際のメニューデータと連携する必要があります
  const menuItems = [
    { id: "1", name: "カット", price: 5000 },
    { id: "2", name: "カラー", price: 8000 },
    // ...
  ];

  const selectedMenuItems = menuItems.filter((item) =>
    selectedMenus.includes(item.id)
  );
  const totalPrice = selectedMenuItems.reduce(
    (sum, item) => sum + item.price,
    0
  );

  const handleSubmit = () => {
    // ここで決済処理を行う
    console.log("Payment processed");
    onNext();
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        お支払い
      </Typography>
      <Typography variant="h6" gutterBottom>
        合計金額: ¥{totalPrice.toLocaleString()}
      </Typography>
      <TextField
        label="カード番号"
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="有効期限 (MM/YY)"
        value={expiryDate}
        onChange={(e) => setExpiryDate(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="CVV"
        value={cvv}
        onChange={(e) => setCvv(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button onClick={onBack}>戻る</Button>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={!cardNumber || !expiryDate || !cvv}
      >
        支払いを完了する
      </Button>
    </div>
  );
};

export default Payment;
