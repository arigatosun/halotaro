import React, { createContext, useContext, useState } from "react";
import { Dayjs } from "dayjs";

interface SelectedMenuItem {
  id: string;
  name: string;
  price: number;
}

interface ReservationContextType {
  selectedMenus: SelectedMenuItem[];
  setSelectedMenus: React.Dispatch<React.SetStateAction<SelectedMenuItem[]>>;
  selectedDate: Date | undefined;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | undefined>>;
  selectedTime: string;
  setSelectedTime: React.Dispatch<React.SetStateAction<string>>;
  selectedStaff: string | null;
  setSelectedStaff: React.Dispatch<React.SetStateAction<string | null>>;
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
  calculateTotalAmount: (menus: any[]) => number;
}

const ReservationContext = createContext<ReservationContextType | undefined>(
  undefined
);

export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedMenus, setSelectedMenus] = useState<SelectedMenuItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const calculateTotalAmount = (menus: any[]) => {
    return menus.reduce((total, menu) => total + menu.price, 0);
  };
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
        calculateTotalAmount,
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
