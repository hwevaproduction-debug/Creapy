import { Box, Skeleton, Stack } from "@mui/material";
import AppCard from "../ui/AppCard";

const StayCardSkeleton = () => (
  <AppCard sx={{ height: "100%", borderRadius: "8px", overflow: "hidden" }}>
    <Skeleton variant="rectangular" height={220} />
    <Box sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Skeleton variant="text" width="72%" height={34} />
        <Skeleton variant="text" width="54%" height={22} />
        <Skeleton variant="text" width="40%" height={22} />
        <Skeleton variant="rectangular" width="100%" height={58} sx={{ borderRadius: "8px" }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
          <Skeleton variant="text" width={120} height={36} />
          <Skeleton variant="rounded" width={112} height={38} />
        </Box>
      </Stack>
    </Box>
  </AppCard>
);

export default StayCardSkeleton;
