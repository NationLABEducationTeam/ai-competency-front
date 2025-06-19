import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import useAlertStore from '../../store/uiStore';

const AlertDialog: React.FC = () => {
  const { isOpen, title, message, onConfirm, closeAlert } = useAlertStore();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    closeAlert();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={closeAlert}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          padding: 2,
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <DialogTitle sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
        <InfoOutlined color="primary" sx={{ mr: 1.5, fontSize: '2rem' }} />
        <Typography variant="h6" component="div" fontWeight="bold">
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        <Typography variant="body1">{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleConfirm} variant="contained" disableElevation fullWidth sx={{ borderRadius: '8px' }}>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertDialog; 