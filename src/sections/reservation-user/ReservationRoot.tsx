// ReservationRoot.tsx
import React, { useState } from "react";
import MenuSelection from "@/sections/reservation-user/menu-selection";
import StaffSelection from "@/sections/reservation-user/staff-selection";
import CustomerInfo from "@/sections/reservation-user/CustomerInfo";
import ReservationComplete from "@/sections/reservation-user/ReservationComplete";
import {
  ReservationProvider,
  useReservation,
} from "@/contexts/reservationcontext";
import Layout from "@/components/layout/reservation-layout";
import ReservationHeader from "./reservation-header";
import ReservationConfirmationAndPayment from "./ReservationConfirmationAndPayment";
import DateSelection from "./DateSelection";

const steps = [
  "メニュー選択",
  "スタッフ選択",
  "日時選択",
  "お客様情報入力",
  "予約内容確認",
  "予約完了",
];

interface ReservationRootProps {
  userId: string;
}

function ReservationContent({ userId }: ReservationRootProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [menuSelectionCompleted, setMenuSelectionCompleted] = useState(false);
  const { setSelectedDateTime } = useReservation();

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    if (activeStep === 0 && menuSelectionCompleted) {
      setMenuSelectionCompleted(false);
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
    }
  };

  const handleMenuSelect = (menuId: string) => {
    setSelectedMenuId(menuId);
    setMenuSelectionCompleted(true);
  };

  const handleStaffSelect = () => {
    handleNext();
  };

  const handleDateTimeSelect = (dateTime: Date) => {
    setSelectedDateTime(dateTime);
    handleNext();
  };

  const handlePaymentComplete = (status: string, paymentIntent?: any) => {
    if (status === "succeeded") {
      setActiveStep(4);
    }
  };

  const getStepContent = (step: number) => {
    console.log("Current step:", step);
    switch (step) {
      case 0:
        return menuSelectionCompleted ? (
          <StaffSelection
            onSelectStaff={handleStaffSelect}
            onBack={handleBack}
            selectedMenuId={selectedMenuId!}
            userId={userId}
          />
        ) : (
          <MenuSelection onSelectMenu={handleMenuSelect} userId={userId} />
        );
      case 1:
        return (
          <DateSelection
            onDateTimeSelect={handleDateTimeSelect}
            onBack={handleBack}
          />
        );
      case 2:
        return <CustomerInfo onNext={handleNext} onBack={handleBack} />;
      case 3:
        return (
          <ReservationConfirmationAndPayment
            onNext={handleNext}
            onBack={handleBack}
            onPaymentComplete={handlePaymentComplete}
            userId={userId}
            selectedMenuId={selectedMenuId!}
          />
        );
      case 4:
        return <ReservationComplete userId={userId} />;
      default:
        return "Unknown step";
    }
  };

  return (
    <Layout>
      <ReservationHeader currentStep={activeStep} />
      <h1>{steps[activeStep]}</h1>
      {getStepContent(activeStep)}
    </Layout>
  );
}

export default function ReservationRoot(props: ReservationRootProps) {
  return (
    <ReservationProvider>
      <ReservationContent {...props} />
    </ReservationProvider>
  );
}
