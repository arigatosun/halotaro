import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  Card,
  Typography,
  Grid,
  Box,
  Modal,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import moment from "moment";
import 'moment/locale/ja';
import Link from "next/link";
import ShiftTable from "./ShiftTable";
import BulkInputModal from "@/components/ui/BulkInputModal";
import { Staff, ShiftData } from "./types";

moment.locale('ja');

const StaffShiftSettings: React.FC = () => {
  const params = useParams();
  const { year, month } = params;
  const [currentDate, setCurrentDate] = useState(moment());
  const [staffShifts, setStaffShifts] = useState<Staff[]>([
    { id: 1, name: "斎藤 憲司", shifts: Array(31).fill({ type: '' }) },
    { id: 2, name: "谷 美加", shifts: Array(31).fill({ type: '' }) },
    { id: 3, name: "鳥山 洋花", shifts: Array(31).fill({ type: '' }) },
    { id: 4, name: "田原 詩朗", shifts: Array(31).fill({ type: '' }) },
  ]);
  const [isBulkInputModalOpen, setIsBulkInputModalOpen] = useState(false);

  useEffect(() => {
    if (year && month) {
      setCurrentDate(moment(`${year}-${month}-01`));
    }
  }, [year, month]);

  const handleBulkInputSubmit = (newShifts: Record<number, ShiftData[]>) => {
    setStaffShifts(prevStaffs => 
      prevStaffs.map(staff => ({
        ...staff,
        shifts: staff.shifts.map((_, index) => 
          newShifts[staff.id] ? newShifts[staff.id][index] : { type: '' }
        )
      }))
    );
    setIsBulkInputModalOpen(false);
  };

  const handleShiftUpdate = (staffId: number, dateIndex: number, newShift: ShiftData) => {
    setStaffShifts(prevStaffs =>
      prevStaffs.map(staff =>
        staff.id === staffId
          ? {
              ...staff,
              shifts: staff.shifts.map((shift, index) =>
                index === dateIndex ? newShift : shift
              ),
            }
          : staff
      )
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <Card style={{ padding: '20px' }}>
        <Grid container justifyContent="space-between" alignItems="center" style={{ marginBottom: '20px' }}>
          <Grid item>
            <Typography variant="h5">シフト設定 ({currentDate.format('YYYY年MM月')})</Typography>
          </Grid>
          <Grid item>
            <HelpOutlineIcon />
          </Grid>
        </Grid>
        <Typography variant="body1" style={{ marginBottom: '20px' }}>
          スタッフの1か月のシフトを設定します。
          休日や予定（一部休や外出など）を設定することで、予約受付が停止できます。
        </Typography>
        <Button 
          variant="contained" 
          style={{ marginBottom: '20px' }}
          onClick={() => setIsBulkInputModalOpen(true)}
        >
          一括入力
        </Button>
        <ShiftTable
          staffShifts={staffShifts}
          currentDate={currentDate}
          onShiftUpdate={handleShiftUpdate}
        />
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Link href="/dashboard/reservations/monthly-settings" passHref>
            <Button variant="contained">
              毎月の受付設定へ
            </Button>
          </Link>
        </Box>
      </Card>
      <Modal
        open={isBulkInputModalOpen}
        onClose={() => setIsBulkInputModalOpen(false)}
      >
        <BulkInputModal
          staffs={staffShifts}
          currentDate={currentDate}
          onSubmit={handleBulkInputSubmit}
          onClose={() => setIsBulkInputModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default StaffShiftSettings;