// ReservationConfirmationAndPayment.tsx
import React, { useState } from "react";
import ReservationConfirmation from "./ReservationConfirmation";
import Payment from "./payments";

interface ReservationConfirmationAndPaymentProps {
  onNext: () => void;
  onBack: () => void;
  onPaymentComplete: (status: string, paymentIntent?: any) => void;
  userId: string;
  selectedMenuId: string;
}

const ReservationConfirmationAndPayment: React.FC<
  ReservationConfirmationAndPaymentProps
> = ({ onNext, onBack, onPaymentComplete, userId, selectedMenuId }) => {
  const [showPayment, setShowPayment] = useState(false);

  const handleConfirmation = () => {
    setShowPayment(true);
  };

  const handlePaymentBack = () => {
    setShowPayment(false);
  };

  return (
    <div>
      {!showPayment ? (
        <ReservationConfirmation onNext={handleConfirmation} onBack={onBack} />
      ) : (
        <Payment
          onBack={handlePaymentBack}
          onPaymentComplete={(status, paymentIntent) => {
            onPaymentComplete(status, paymentIntent);
          }}
          userId={userId}
          selectedMenuId={selectedMenuId}
        />
      )}
    </div>
  );
};

export default ReservationConfirmationAndPayment;
