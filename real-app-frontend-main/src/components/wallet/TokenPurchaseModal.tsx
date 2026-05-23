import { useEffect, useRef, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useDispatch } from "react-redux";
import AppButton from "../ui/AppButton";
import { addTokens } from "../../redux/wallet/walletSlice";

type TokenPurchaseModalProps = {
  open: boolean;
  onClose: () => void;
};

const TokenPurchaseModal = ({ open, onClose }: TokenPurchaseModalProps) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const paymentTimeoutRef = useRef<number | null>(null);
  const successTimeoutRef = useRef<number | null>(null);
  const activePurchaseRef = useRef(false);

  const clearPurchaseTimers = () => {
    if (paymentTimeoutRef.current !== null) {
      window.clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = null;
    }

    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      clearPurchaseTimers();
      activePurchaseRef.current = false;
      setLoading(false);
      setSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      clearPurchaseTimers();
      activePurchaseRef.current = false;
    };
  }, []);

  const handlePayment = () => {
    if (loading || success) return;

    clearPurchaseTimers();
    activePurchaseRef.current = true;
    setLoading(true);

    paymentTimeoutRef.current = window.setTimeout(() => {
      paymentTimeoutRef.current = null;

      if (!activePurchaseRef.current) return;

      dispatch(addTokens({ amount: 100, label: "Token purchase — $10" }));
      setLoading(false);
      setSuccess(true);

      successTimeoutRef.current = window.setTimeout(() => {
        successTimeoutRef.current = null;
        activePurchaseRef.current = false;
        setSuccess(false);
        onClose();
      }, 1500);
    }, 1500);
  };

  const handleClose = () => {
    if (loading || success) return;

    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Buy TR Tokens</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            background:
              "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #B8975A, #E0C285) border-box",
            border: "2px solid transparent",
            borderRadius: "16px",
            p: 2,
            mb: 2,
          }}
        >
          <Box sx={{ color: "#1F2937", fontSize: "22px", fontWeight: 800 }}>
            $10 → 100 TR Tokens
          </Box>
          <Box sx={{ color: "text.secondary", fontSize: "13px", mt: 0.5 }}>
            Demo payment package
          </Box>
        </Box>
        {success ? (
          <Box
            sx={{
              background: "#D1EAE0",
              borderRadius: "12px",
              color: "#1F4D3A",
              fontWeight: 800,
              p: 2,
              textAlign: "center",
            }}
          >
            ✓ 100 TR Tokens added!
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField label="Cardholder name" fullWidth />
            <TextField label="Card number (demo only)" fullWidth />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <AppButton variant="outlined" disabled={loading || success} onClick={handleClose}>
          Cancel
        </AppButton>
        <AppButton loading={loading} disabled={loading || success} onClick={handlePayment}>
          Pay $10 (Demo)
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default TokenPurchaseModal;
