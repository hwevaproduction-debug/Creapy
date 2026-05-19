import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
};

const ConfirmDialog = ({
  open,
  title,
  message,
  onConfirm,
  onClose,
  loading,
}: ConfirmDialogProps) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button onClick={onConfirm} disabled={loading} variant="contained">
        {loading ? "Working..." : "Confirm"}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
