"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import MenuSelection from "@/sections/reservation-user/menu-selection";
import DateTimeStaffSelection from "@/sections/reservation-user/DataTimeStaffSelection";
import CustomerInfo from "@/sections/reservation-user/CustomerInfo";
import ReservationConfirmation from "@/sections/reservation-user/ReservationConfirmation";
import Payment from "@/sections/reservation-user/payments";
import ReservationComplete from "@/sections/reservation-user/ReservationComplete";
import { ReservationProvider } from "@/contexts/reservationcontext";
import Layout from "@/components/layout/reservation-layout";

const steps = [
  "メニュー選択",
  "日時・スタッフ選択",
  "お客様情報入力",
  "予約内容確認",
  "事前決済",
  "予約完了",
];

export default function ReservationRoot() {
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const userId = params?.["user-id"] as string;

  useEffect(() => {
    console.log("User ID:", userId);
    setIsLoading(false);
  }, [userId]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <MenuSelection onNext={handleNext} userId={userId} />;
      case 1:
        return (
          <DateTimeStaffSelection onNext={handleNext} onBack={handleBack} />
        );
      case 2:
        return <CustomerInfo onNext={handleNext} onBack={handleBack} />;
      case 3:
        return (
          <ReservationConfirmation onNext={handleNext} onBack={handleBack} />
        );
      case 4:
        return <Payment onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <ReservationComplete />;
      default:
        return "Unknown step";
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!userId) {
    return <div>Error: User ID not found</div>;
  }

  return (
    <ReservationProvider>
      <Layout>
        <h1>{steps[activeStep]}</h1>
        {getStepContent(activeStep)}
      </Layout>
    </ReservationProvider>
  );
}
