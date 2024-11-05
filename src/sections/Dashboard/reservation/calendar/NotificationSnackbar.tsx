import React from 'react';
import { Snackbar, Alert } from '@mui/material';

interface NotificationSnackbarProps {
  snackbar: { message: string; severity: 'success' | 'error' } | null;
  onClose: () => void;
}

const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({ snackbar, onClose }) => {
  return (
    <Snackbar
      open={!!snackbar}
      autoHideDuration={750} // 6000から1000に変更（1秒）
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity={snackbar?.severity}
        sx={{
          width: '100%',
          borderRadius: '8px',
          boxShadow: 3,
        }}
      >
        {snackbar?.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationSnackbar;