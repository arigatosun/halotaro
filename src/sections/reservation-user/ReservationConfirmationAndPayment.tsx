import React, { useState } from "react";
import ReservationConfirmation from "./ReservationConfirmation";
import Payment from "./payments";
import { useReservation } from "@/contexts/reservationcontext";
import { differenceInDays } from 'date-fns';

interface ReservationConfirmationAndPaymentProps {
  onNext: () => void;
  onBack: () => void;
  onPaymentComplete: (status: string, paymentIntent?: any) => void;
  userId: string;
}

const ReservationConfirmationAndPayment: React.FC<ReservationConfirmationAndPaymentProps> = ({
  onNext,
  onBack,
  onPaymentComplete,
  userId,
}) => {
  const [showPayment, setShowPayment] = useState(false);
  const { selectedDateTime, reservationCustomerId, customerInfo, selectedMenus } = useReservation();

  const handleConfirmation = () => {
    setShowPayment(true);
  };

  const handlePaymentBack = () => {
    setShowPayment(false);
  };

  const isOver30Days = selectedDateTime
    ? differenceInDays(selectedDateTime.start, new Date()) >= 30
    : false;

  const totalAmount = selectedMenus.reduce((total, menu) => total + menu.price, 0);

  if (!reservationCustomerId) {
    console.warn('reservationCustomerId is undefined at this stage.');
  }

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
          isOver30Days={isOver30Days}
          totalAmount={totalAmount}
        />
      )}
    </div>
  );
};

export default ReservationConfirmationAndPayment;