import { Box, Grid } from "@mui/material";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";

const steps = [
  ["Create Account", "Sign up as a tenant"],
  ["Browse Listings", "Search by location, price, amenities"],
  ["Use TR Tokens", "Start with 100 free tokens"],
  ["Contact Landlords", "Send a message for 5 TR"],
  ["Move In", "Landlord shares address after approval"],
];

const TenantGuide = () => (
  <Box>
    <Box sx={{ background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)", pt: { xs: 12, md: 14 }, pb: { xs: 6, md: 8 }, textAlign: "center", px: 2 }}>
      <Box sx={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "#B8975A", textTransform: "uppercase", mb: 2 }}>Tenant Guide</Box>
      <Box component="h1" sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 800, color: "#fff", m: 0 }}>Find Your Next Home</Box>
    </Box>
    <AppContainer sx={{ py: { xs: 6, md: 8 } }}>
      <Grid container spacing={3}>
        {steps.map(([title, body], index) => (
          <Grid item xs={12} md={index === 4 ? 12 : 6} key={title}>
            <AppCard sx={{ p: 3, height: "100%" }}>
              <Box sx={{ color: "#B8975A", fontWeight: 800, mb: 1 }}>Step {index + 1}</Box>
              <Box sx={{ fontWeight: 800, fontSize: "20px" }}>{title}</Box>
              <Box sx={{ color: "text.secondary", mt: 1 }}>{body}</Box>
            </AppCard>
          </Grid>
        ))}
      </Grid>
    </AppContainer>
  </Box>
);

export default TenantGuide;
