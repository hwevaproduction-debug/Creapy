import { useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import AppButton from "../ui/AppButton";
import useTypedSelector from "../../hooks/useTypedSelector";
import { selectTokenBalance } from "../../redux/wallet/walletSlice";
import { useRestoreListingMutation } from "../../redux/api/listingApiSlice";

type ListingRestoreModalProps = {
  open: boolean;
  listingId: string | null;
  listingName: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

const ListingRestoreModal = ({
  open,
  listingId,
  listingName,
  onClose,
  onSuccess,
}: ListingRestoreModalProps) => {
  const [days, setDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tokenBalance = useTypedSelector(selectTokenBalance);
  const [restoreListing] = useRestoreListingMutation();

  const afterBalance = useMemo(() => tokenBalance - days, [days, tokenBalance]);
  const canConfirm = Boolean(listingId) && !isSubmitting && afterBalance >= 0;

  const handleConfirm = async () => {
    if (!listingId || afterBalance < 0) return;

    setIsSubmitting(true);
    try {
      await restoreListing({ id: listingId, days }).unwrap();
      await onSuccess();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Restore Listing</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{listingName}</Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Restore this expired listing using TR tokens.
            </Typography>
          </Box>

          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Days</Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                {days} day{days === 1 ? "" : "s"}
              </Typography>
            </Box>
            <Slider
              min={1}
              max={30}
              step={1}
              value={days}
              onChange={(_, value) => setDays(Array.isArray(value) ? value[0] : value)}
            />
            <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 1 }}>
              Cost preview: {days} TR tokens for {days} day{days === 1 ? "" : "s"}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: "rgba(31,77,58,0.06)",
            }}
          >
            <Typography sx={{ fontSize: 13 }}>
              Your balance: {tokenBalance} TR → After:{" "}
              <Box
                component="span"
                sx={{ color: afterBalance < 0 ? "#dc2626" : "inherit", fontWeight: 800 }}
              >
                {afterBalance} TR
              </Box>
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <AppButton variant="outlined" onClick={onClose}>
          Cancel
        </AppButton>
        <AppButton
          onClick={handleConfirm}
          disabled={!canConfirm}
          loading={isSubmitting}
          sx={{ background: "#1F4D3A", color: "#fff", "&:hover": { background: "#173B2C" } }}
        >
          Confirm
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default ListingRestoreModal;
