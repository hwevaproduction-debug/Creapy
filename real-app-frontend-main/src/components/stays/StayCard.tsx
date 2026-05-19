import { KeyboardEvent } from "react";
import { Box, Chip, Stack } from "@mui/material";
import { FaLocationDot, FaUserGroup } from "react-icons/fa6";
import { Heading, SubHeading } from "../Heading";
import AppButton from "../ui/AppButton";
import AppCard from "../ui/AppCard";
import { thousandSeparatorNumber } from "../../utils";

interface StayCardProps {
  room: any;
  onOpen: () => void;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80";

const getRoomName = (room: any) =>
  room?.name || room?.title || room?.roomType || room?.type || "Temporary stay";

const getRoomLocation = (room: any) =>
  room?.location ||
  room?.address ||
  room?.accommodation?.city ||
  room?.city ||
  room?.accommodation?.province ||
  room?.province ||
  "Location unavailable";

const getRoomDescription = (room: any) =>
  room?.description || room?.summary || room?.details || "No description available yet.";

const getRoomImage = (room: any) => {
  if (Array.isArray(room?.images) && room.images.length > 0) {
    const firstImage = room.images[0];
    return typeof firstImage === "string" ? firstImage : firstImage?.url || FALLBACK_IMAGE;
  }

  if (typeof room?.image === "string") return room.image;
  if (typeof room?.coverImage === "string") return room.coverImage;
  return FALLBACK_IMAGE;
};

const getRoomPrice = (room: any) =>
  Number(
    room?.resolvedPrice ||
      room?.basePricePerNight ||
      room?.pricePerNight ||
      room?.nightlyRate ||
      room?.price ||
      0
  );

const getRoomCapacity = (room: any) =>
  Number(room?.maxGuests || room?.capacity || room?.guests || room?.occupancy || 1);

const getBookingMode = (room: any) =>
  String(room?.bookingMode || room?.bookingSettings?.mode || room?.settings?.bookingMode || "REQUEST")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const getRating = (room: any) => {
  const rating = Number(room?.avgRating || room?.averageRating || room?.rating || 0);

  return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null;
};

const StayCard = ({ room, onOpen }: StayCardProps) => {
  const price = getRoomPrice(room);
  const bookingMode = getBookingMode(room);
  const rating = getRating(room);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <AppCard
      role="article"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      sx={{
        height: "100%",
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        outline: "none",
        "&:focus-visible": {
          boxShadow: "0 0 0 3px rgba(20, 184, 166, 0.35)",
        },
      }}
    >
      <Box
        component="img"
        src={getRoomImage(room)}
        alt={getRoomName(room)}
        sx={{ height: 220, objectFit: "cover", width: "100%" }}
      />
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5, flex: 1 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip
            size="small"
            label={bookingMode === "INSTANT" ? "⚡ Instant" : "📋 Request"}
            sx={{
              alignSelf: "flex-start",
              background: bookingMode === "INSTANT" ? "#DBEAFE" : "#FEF3C7",
              color: bookingMode === "INSTANT" ? "#1D4ED8" : "#B45309",
              fontWeight: 700,
            }}
          />
          {rating ? (
            <Chip
              size="small"
              label={`★ ${rating}`}
              sx={{ background: "#ECFDF5", color: "#047857", fontWeight: 700 }}
            />
          ) : null}
        </Stack>

        <Heading sx={{ fontSize: "22px" }}>{getRoomName(room)}</Heading>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#475569" }}>
          <FaLocationDot />
          <SubHeading>{getRoomLocation(room)}</SubHeading>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#475569" }}>
          <FaUserGroup />
          <SubHeading>Up to {getRoomCapacity(room)} guests</SubHeading>
        </Box>

        <SubHeading
          sx={{
            color: "#334155",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {getRoomDescription(room)}
        </SubHeading>

        <Box
          sx={{
            mt: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
            ${thousandSeparatorNumber(price)}
            <Box component="span" sx={{ fontSize: "14px", color: "#64748b", ml: 0.5 }}>
              /night
            </Box>
          </Box>
          <AppButton onClick={onOpen}>View details</AppButton>
        </Box>
      </Box>
    </AppCard>
  );
};

export default StayCard;
