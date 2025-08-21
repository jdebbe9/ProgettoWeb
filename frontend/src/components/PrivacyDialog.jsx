// src/components/PrivacyDialog.jsx
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import PrivacyContent from './PrivacyContent';

export default function PrivacyDialog({ open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      aria-labelledby="privacy-dialog-title"
    >
      <DialogTitle id="privacy-dialog-title">Informativa Privacy</DialogTitle>
      <DialogContent dividers>
        <PrivacyContent />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}
