import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
} from "@mui/material";
import { Heading, SubHeading } from "../Heading";
import AppButton from "../ui/AppButton";
import AppCard from "../ui/AppCard";
import AppInput from "../ui/AppInput";
import AppSelect from "../ui/AppSelect";
import { StayFilterField, StayFilterState } from "../../hooks/useStayFilters";

interface FilterPanelProps {
  filters: StayFilterState;
  onChange: (field: StayFilterField, value: StayFilterState[StayFilterField]) => void;
  onClear: () => void;
}

const ROOM_TYPE_OPTIONS = [
  { label: "Any room type", value: "" },
  { label: "Single", value: "SINGLE" },
  { label: "Double", value: "DOUBLE" },
  { label: "Twin", value: "TWIN" },
  { label: "Suite", value: "SUITE" },
  { label: "Studio", value: "STUDIO" },
  { label: "Entire unit", value: "ENTIRE_UNIT" },
];

const RATING_OPTIONS = [
  { label: "Any rating", value: "" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
  { label: "5", value: "5" },
];

const BOOKING_MODE_OPTIONS = [
  { label: "All booking types", value: "" },
  { label: "Instant", value: "INSTANT" },
  { label: "Request to Book", value: "REQUEST" },
];

const AMENITY_OPTIONS = [
  { label: "Wi-Fi", value: "wifi" },
  { label: "Breakfast Included", value: "breakfast" },
  { label: "Secure Parking", value: "parking" },
  { label: "Swimming Pool", value: "pool" },
  { label: "Air Conditioning", value: "aircon" },
  { label: "Conference Room", value: "conference-room" },
  { label: "Airport Pickup", value: "airport-pickup" },
  { label: "Family Friendly", value: "family-friendly" },
];

const sectionTitleSx = {
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#94A3B8",
  mb: 1.25,
};

const FilterPanel = ({ filters, onChange, onClear }: FilterPanelProps) => {
  const toggleAmenity = (amenityValue: string) => {
    const nextAmenities = filters.amenities.includes(amenityValue)
      ? filters.amenities.filter((item) => item !== amenityValue)
      : [...filters.amenities, amenityValue];

    onChange("amenities", nextAmenities);
  };

  return (
    <AppCard elevation="flat" sx={{ p: 2.5, borderRadius: "16px" }}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
          <Heading sx={{ fontSize: "18px", fontWeight: 700 }}>Filters</Heading>
          <AppButton size="small" variant="text" sx={{ color: "#1F4D3A" }} onClick={onClear}>
            Clear
          </AppButton>
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Price range</SubHeading>
          <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={1.25}>
            <AppInput
              label="Minimum"
              type="number"
              value={filters.minPrice}
              onChange={(event) => onChange("minPrice", event.target.value)}
              inputProps={{ min: 0 }}
            />
            <AppInput
              label="Maximum"
              type="number"
              value={filters.maxPrice}
              onChange={(event) => onChange("maxPrice", event.target.value)}
              inputProps={{ min: 0 }}
            />
          </Stack>
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Room type</SubHeading>
          <AppSelect
            name="roomType"
            options={ROOM_TYPE_OPTIONS}
            value={filters.roomType}
            onChange={(event) => onChange("roomType", event.target.value as string)}
            size="small"
            displayEmpty
          />
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Minimum rating</SubHeading>
          <AppSelect
            name="minRating"
            options={RATING_OPTIONS}
            value={filters.minRating}
            onChange={(event) => onChange("minRating", event.target.value as string)}
            size="small"
            displayEmpty
          />
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Amenities</SubHeading>
          <Stack spacing={0.5}>
            {AMENITY_OPTIONS.map((amenity) => (
              <FormControlLabel
                key={amenity.value}
                control={
                  <Checkbox
                    checked={filters.amenities.includes(amenity.value)}
                    onChange={() => toggleAmenity(amenity.value)}
                  />
                }
                label={amenity.label}
                sx={{ alignItems: "flex-start", m: 0 }}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Booking type</SubHeading>
          <AppSelect
            name="bookingMode"
            options={BOOKING_MODE_OPTIONS}
            value={filters.bookingMode}
            onChange={(event) => onChange("bookingMode", event.target.value as string)}
            size="small"
            displayEmpty
          />
        </Box>

        <Divider />

        <Box>
          <SubHeading sx={sectionTitleSx}>Property rules</SubHeading>
          <Stack spacing={0.5}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.selfCheckIn}
                  onChange={(event) => onChange("selfCheckIn", event.target.checked)}
                />
              }
              label="Self Check-in"
              sx={{ m: 0 }}
            />
          </Stack>
        </Box>
      </Stack>
    </AppCard>
  );
};

export default FilterPanel;
