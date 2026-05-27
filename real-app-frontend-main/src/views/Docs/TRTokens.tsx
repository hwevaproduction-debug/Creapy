import { Box, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";

const rows = [
  ["Contact Landlord", "5 TR", "Tenant"],
  ["Approve Tenant Request", "5 TR", "Landlord"],
  ["Featured Listing (coming soon)", "20 TR", "Landlord"],
  ["Premium Visibility Boost (coming soon)", "10 TR", "Landlord"],
];

const TRTokens = () => (
  <Box>
    <Box sx={{ background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)", pt: { xs: 12, md: 14 }, pb: { xs: 6, md: 8 }, textAlign: "center", px: 2 }}>
      <Box sx={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "#B8975A", textTransform: "uppercase", mb: 2 }}>TR Tokens</Box>
      <Box component="h1" sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 800, color: "#fff", m: 0 }}>Token Guide</Box>
    </Box>
    <AppContainer sx={{ py: { xs: 6, md: 8 }, display: "grid", gap: 2 }}>
      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>1. What are TR Tokens?</Box>
        <Box sx={{ color: "text.secondary", lineHeight: 1.7 }}>TR Tokens are the Town Ruins platform currency for premium interactions.</Box>
      </AppCard>
      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>2. Getting Started</Box>
        <Box sx={{ color: "text.secondary", lineHeight: 1.7 }}>Every new account receives 100 welcome tokens. You can buy more from your dashboard wallet.</Box>
      </AppCard>
      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 2 }}>3. Token Actions</Box>
        <Table>
          <TableHead>
            <TableRow>{["Action", "Cost", "Who Pays"].map((heading) => <TableCell key={heading} sx={{ fontWeight: 800 }}>{heading}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row[0]}>{row.map((cell) => <TableCell key={cell}>{cell}</TableCell>)}</TableRow>
            ))}
          </TableBody>
        </Table>
      </AppCard>
      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>4. Purchasing Tokens</Box>
        <Box sx={{ color: "text.secondary", lineHeight: 1.7 }}>$10 = 100 TR in the mock payment flow, with $5/50TR, $10/100TR, and $25/300TR tiers.</Box>
      </AppCard>
      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>5. Transaction History</Box>
        <Box sx={{ color: "text.secondary", lineHeight: 1.7 }}>Your dashboard wallet card shows recent credits, debits, and token balance changes.</Box>
      </AppCard>
      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1 }}>6. Coming Soon</Box>
        <Box sx={{ color: "text.secondary", lineHeight: 1.7 }}>Featured listings, visibility boosts, and mobile top-up flows are planned next.</Box>
      </AppCard>
    </AppContainer>
  </Box>
);

export default TRTokens;
