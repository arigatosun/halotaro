import React, { useState } from "react";
import { Box } from "@mui/material";
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
  "事前決済",
  "予約完了",
];

interface ReservationRootProps {
  userId: string;
}

function ReservationContent({ userId }: ReservationRootProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [menuSelectionCompleted, setMenuSelectionCompleted] = useState(false);
  const { 
    selectedMenus, 
    setSelectedMenus, 
    selectedStaff, 
    setSelectedStaff, 
    setSelectedDateTime 
  } = useReservation();

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

  const handleMenuSelect = (menuId: string, name: string, price: number) => {
    setSelectedMenus([{ id: menuId, name, price }]);
    setMenuSelectionCompleted(true);
    handleNext();
  };

  const handleStaffSelect = (staff: { id: string; name: string } | null) => {
    setSelectedStaff(staff);
    handleNext();
  };

  const handleDateTimeSelect = (startTime: Date, endTime: Date) => {
    setSelectedDateTime({ start: startTime, end: endTime });
    handleNext();
  };

  const handlePaymentComplete = (status: string, paymentIntent?: any) => {
    if (status === "succeeded") {
      setActiveStep(5);
    }
  };

  const getStepContent = (step: number) => {
    console.log("Current step:", step);
    switch (step) {
      case 0:
        return (
          <MenuSelection onSelectMenu={handleMenuSelect} userId={userId} />
        );
      case 1:
        return (
          <StaffSelection
            onSelectStaff={handleStaffSelect}
            onBack={handleBack}
            selectedMenuId={selectedMenus[0]?.id || ""}
            userId={userId}
          />
        );
        case 2:
          return (
            <Box sx={{ width: '100%', overflowX: 'auto', margin: '0 -16px' }}>
              <DateSelection
                onDateTimeSelect={handleDateTimeSelect}
                onBack={handleBack}
                selectedStaff={selectedStaff}
                selectedMenuId={selectedMenus[0]?.id || ""}
              />
            </Box>
          );
      case 3:
        return <CustomerInfo onNext={handleNext} onBack={handleBack} />;
      case 4:
        return (
          <ReservationConfirmationAndPayment
            onNext={handleNext}
            onBack={handleBack}
            onPaymentComplete={handlePaymentComplete}
            userId={userId}
            selectedMenuId={selectedMenus[0]?.id || ""}
          />
        );
      case 5:
        return <ReservationComplete userId={userId} />;
      default:
        return "Unknown step";
    }
  };

  return (
    <Layout>
      <Box sx={{ padding: '0 16px' }}>
        <ReservationHeader currentStep={activeStep} />
       
        {getStepContent(activeStep)}
      </Box>
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