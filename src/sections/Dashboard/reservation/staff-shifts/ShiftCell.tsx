import React, { useState } from "react";
import { Button, Popover } from "@mui/material";
import ShiftPopover from "@/sections/Dashboard/reservation/staff-shifts/ShiftPopover";
import { ShiftData } from "@/sections/Dashboard/reservation/staff-shifts/types";

interface ShiftCellProps {
  shift: ShiftData;
  staffId: number;
  dateIndex: number;
  onShiftUpdate: (staffId: number, dateIndex: number, newShift: ShiftData) => void;
}

const ShiftCell: React.FC<ShiftCellProps> = ({ shift, staffId, dateIndex, onShiftUpdate }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleShiftUpdate = (newShift: ShiftData) => {
    onShiftUpdate(staffId, dateIndex, newShift);
    handleClose();
  };

  const buttonText = shift.type || "未設定";
  const buttonColor = shift.type === "休" ? "#ff9800" : shift.type === "出" ? "#2196f3" : shift.type === "店休" ? "#f44336" : "#e0e0e0";
  const textColor = shift.type ? "#ffffff" : "#000000";

  return (
    <>
      <Button
        variant="contained"
        size="small"
        onClick={handleClick}
        style={{
          backgroundColor: buttonColor,
          color: textColor,
          minWidth: '40px',
          maxWidth: '40px',
          minHeight: '30px',
          maxHeight: '30px',
          padding: '2px 4px',
          fontSize: '0.75rem',
          boxShadow: 'none',
          borderRadius: '4px',
          margin: '2px',
        }}
      >
        {buttonText}
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <ShiftPopover
          currentShift={shift}
          onSubmit={handleShiftUpdate}
          onClose={handleClose}
        />
      </Popover>
    </>
  );
};

export default ShiftCell;