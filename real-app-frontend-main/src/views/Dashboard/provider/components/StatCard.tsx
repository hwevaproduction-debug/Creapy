import { Paper, Typography } from "@mui/material";

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
};

const StatCard = ({ label, value, sub }: StatCardProps) => (
  <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 700 }}>
      {value}
    </Typography>
    {sub ? (
      <Typography variant="caption" color="text.secondary">
        {sub}
      </Typography>
    ) : null}
  </Paper>
);

export default StatCard;
