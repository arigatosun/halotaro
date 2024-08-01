import React, { createContext, useContext, useState } from "react";
import { Dayjs } from "dayjs";

interface ReservationContextType {
  selectedMenus: string[];
  setSelectedMenus: React.Dispatch<React.SetStateAction<string[]>>;
  selectedDate: Date | undefined;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | undefined>>;
  selectedTime: string;
  setSelectedTime: React.Dispatch<React.SetStateAction<string>>;
  selectedStaff: string;
  setSelectedStaff: React.Dispatch<React.SetStateAction<string>>;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  setCustomerInfo: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      phone: string;
    }>
  >;
}

const ReservationContext = createContext<ReservationContextType | undefined>(
  undefined
);

export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  return (
    <ReservationContext.Provider
      value={{
        selectedMenus,
        setSelectedMenus,
        selectedDate,
        setSelectedDate,
        selectedTime,
        setSelectedTime,
        selectedStaff,
        setSelectedStaff,
        customerInfo,
        setCustomerInfo,
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
};

export const useReservation = () => {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error("useReservation must be used within a ReservationProvider");
  }
  return context;
};
