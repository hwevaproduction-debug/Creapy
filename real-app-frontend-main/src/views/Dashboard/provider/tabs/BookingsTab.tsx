import { useMemo, useState } from "react";
import { Button, Chip, Paper, Stack, Typography } from "@mui/material";
import {
  useCancelBookingMutation,
  useConfirmBookingMutation,
  useDeclineBookingMutation,
} from "../../../../redux/api/providerApiSlice";
import ConfirmDialog from "../components/ConfirmDialog";
import DeclineDialog from "../components/DeclineDialog";

type BookingsTabProps = {
  bookings: any[];
};

const filters = ["ALL", "PENDING_CONFIRMATION", "CONFIRMED", "CHECKED_IN", "COMPLETED"];
const getBookingId = (booking: any) => booking?._id || booking?.id;

const BookingsTab = ({ bookings }: BookingsTabProps) => {
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<any>(null);
  const [declining, setDeclining] = useState<any>(null);
  const [confirmBooking, { isLoading: confirming }] = useConfirmBookingMutation();
  const [declineBooking, { isLoading: decliningBooking }] = useDeclineBookingMutation();
  const [cancelBooking, { isLoading: canceling }] = useCancelBookingMutation();

  const filteredBookings = useMemo(
    () =>
      filter === "ALL"
        ? bookings
        : bookings.filter((booking) => String(booking?.status || "").toUpperCase() === filter),
    [bookings, filter]
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {filters.map((item) => (
          <Chip
            key={item}
            label={item.replace(/_/g, " ")}
            color={filter === item ? "primary" : "default"}
            onClick={() => setFilter(item)}
          />
        ))}
      </Stack>
      {filteredBookings.map((booking) => (
        <Paper key={getBookingId(booking)} variant="outlined" sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <div>
              <Typography variant="subtitle1" fontWeight={700}>
                {booking?.guest?.username || booking?.guest?.name || "Guest"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {booking?.room?.name || "Room"} · {String(booking?.status || "PENDING").replace(/_/g, " ")}
              </Typography>
              <Typography variant="body2">
                {String(booking?.checkIn || "").slice(0, 10)} to {String(booking?.checkOut || "").slice(0, 10)}
              </Typography>
            </div>
            <Stack direction="row" spacing={1} alignItems="center">
              {booking?.status === "PENDING_CONFIRMATION" ? (
                <>
                  <Button size="small" variant="contained" onClick={() => setSelected(booking)}>
                    Confirm
                  </Button>
                  <Button size="small" color="error" onClick={() => setDeclining(booking)}>
                    Decline
                  </Button>
                </>
              ) : null}
              {["PENDING_CONFIRMATION", "CONFIRMED"].includes(booking?.status) ? (
                <Button
                  size="small"
                  color="error"
                  onClick={() => cancelBooking({ id: getBookingId(booking), body: { reason: "Canceled by provider" } })}
                >
                  Cancel
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Paper>
      ))}
      {!filteredBookings.length ? <Typography>No bookings found.</Typography> : null}
      <ConfirmDialog
        open={Boolean(selected)}
        title="Confirm Booking"
        message="Confirm this booking request?"
        loading={confirming || canceling}
        onClose={() => setSelected(null)}
        onConfirm={async () => {
          await confirmBooking(getBookingId(selected)).unwrap();
          setSelected(null);
        }}
      />
      <DeclineDialog
        open={Boolean(declining)}
        loading={decliningBooking}
        onClose={() => setDeclining(null)}
        onDecline={async (reason) => {
          await declineBooking({ id: getBookingId(declining), reason }).unwrap();
          setDeclining(null);
        }}
      />
    </Stack>
  );
};

export default BookingsTab;
