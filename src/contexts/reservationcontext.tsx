import React, { createContext, useContext, useState } from "react";

interface SelectedMenuItem {
  id: string;
  name: string;
  price: number;
}

interface SelectedStaff {
  id: string;
  name: string;
}

interface ReservationContextType {
  selectedMenus: SelectedMenuItem[];
  setSelectedMenus: React.Dispatch<React.SetStateAction<SelectedMenuItem[]>>;
  selectedDateTime: Date | null;
  setSelectedDateTime: React.Dispatch<React.SetStateAction<Date | null>>;
  selectedStaff: SelectedStaff | null;
  setSelectedStaff: React.Dispatch<React.SetStateAction<SelectedStaff | null>>;
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
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<SelectedStaff | null>(
    null
  );
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
        selectedDateTime,
        setSelectedDateTime,
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
