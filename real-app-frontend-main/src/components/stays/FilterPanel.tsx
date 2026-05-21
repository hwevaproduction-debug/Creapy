import {
  Box,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
} from "@mui/material";
import { Heading } from "../Heading";
import AppButton from "../ui/AppButton";
import AppCard from "../ui/AppCard";
import AppInput from "../ui/AppInput";
import { StayFilterField, StayFilterState } from "../../hooks/useStayFilters";

interface FilterPanelProps {
  filters: StayFilterState;
  onChange: (field: StayFilterField, value: StayFilterState[StayFilterField]) => void;
  onClear: () => void;
}

const ROOM_TYPE_OPTIONS = [
  { label: "Single", value: "SINGLE" },
  { label: "Double", value: "DOUBLE" },
  { label: "Twin", value: "TWIN" },
  { label: "Suite", value: "SUITE" },
  { label: "Studio", value: "STUDIO" },
  { label: "Entire unit", value: "ENTIRE_UNIT" },
];

const RATING_OPTIONS = [
  { label: "Any", value: "" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
  { label: "5", value: "5" },
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

const filterChipSx = (active: boolean) =>
  active
    ? {
        background: "#B8975A",
        color: "#FFFFFF",
        border: "1px solid #B8975A",
        fontWeight: 700,
        "&:hover": {
          background: "#9E7E45",
        },
      }
    : {
        border: "1px solid #E2E8F0",
        color: "#475569",
        fontWeight: 600,
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
          <Heading sx={sectionTitleSx}>Price range</Heading>
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
          <Heading sx={sectionTitleSx}>Room type</Heading>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {ROOM_TYPE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                variant="outlined"
                sx={filterChipSx(filters.roomType === option.value)}
                onClick={() => onChange("roomType", filters.roomType === option.value ? "" : option.value)}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Heading sx={sectionTitleSx}>Minimum rating</Heading>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {RATING_OPTIONS.map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                variant="outlined"
                sx={filterChipSx(filters.minRating === option.value)}
                onClick={() => onChange("minRating", option.value)}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Heading sx={sectionTitleSx}>Amenities</Heading>
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
          <Heading sx={sectionTitleSx}>Booking type</Heading>
          <RadioGroup
            value={filters.bookingMode}
            onChange={(event) => onChange("bookingMode", event.target.value)}
          >
            <FormControlLabel value="" control={<Radio />} label="All" />
            <FormControlLabel value="INSTANT" control={<Radio />} label="Instant" />
            <FormControlLabel value="REQUEST" control={<Radio />} label="Request to Book" />
          </RadioGroup>
        </Box>

        <Divider />

        <Box>
          <Heading sx={sectionTitleSx}>Property rules</Heading>
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
