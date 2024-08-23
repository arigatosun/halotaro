import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from "@mui/material";
import moment from "moment";
import ShiftCell from "@/sections/Dashboard/reservation/staff-shifts/ShiftCell";
import { Staff,ShiftData } from "@/sections/Dashboard/reservation/staff-shifts/types";

interface ShiftTableProps {
  staffShifts: Staff[];
  currentDate: moment.Moment;
  onShiftUpdate: (staffId: number, dateIndex: number, newShift: ShiftData) => void;
}

const ShiftTable: React.FC<ShiftTableProps> = ({ staffShifts, currentDate, onShiftUpdate }) => {
  const daysInMonth = currentDate.daysInMonth();

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>スタッフ名</TableCell>
            <TableCell>設定状況</TableCell>
            <TableCell>設定</TableCell>
            {Array.from({ length: daysInMonth }, (_, i) => (
              <TableCell key={i} align="center">
                {i + 1}
                <br />
                <span style={{ 
                  color: moment(currentDate).date(i + 1).day() === 0 ? 'red' : 
                         moment(currentDate).date(i + 1).day() === 6 ? 'blue' : 'inherit'
                }}>
                  ({moment(currentDate).date(i + 1).format("ddd")})
                </span>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {staffShifts.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell>{staff.name}</TableCell>
              <TableCell>
                <Button variant="contained" size="small">設定済</Button>
              </TableCell>
              <TableCell>
                <Button variant="contained" size="small">設定</Button>
              </TableCell>
              {staff.shifts.map((shift, index) => (
                <TableCell key={index} align="center">
                  <ShiftCell
                    shift={shift}
                    staffId={staff.id}
                    dateIndex={index}
                    onShiftUpdate={onShiftUpdate}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ShiftTable;