import { Box, Stack } from "@mui/material";
import { useSelector } from "react-redux";
import { selectTransactions } from "../../redux/wallet/walletSlice";

type TransactionListProps = {
  maxItems?: number;
};

const formatTimestamp = (timestamp: string) =>
  new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const TransactionList = ({ maxItems = 10 }: TransactionListProps) => {
  const transactions = useSelector(selectTransactions);
  const visibleTransactions = [...transactions]
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    )
    .slice(0, maxItems);

  if (visibleTransactions.length === 0) {
    return (
      <Box sx={{ color: "text.secondary", fontSize: "14px", py: 1 }}>
        No transactions yet
      </Box>
    );
  }

  return (
    <Stack spacing={1}>
      {visibleTransactions.map((transaction) => {
        const isCredit = transaction.type === "CREDIT";

        return (
          <Box
            key={transaction.id}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              borderBottom: "1px solid rgba(148,163,184,0.2)",
              pb: 1,
              "&:last-child": {
                borderBottom: 0,
                pb: 0,
              },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ fontWeight: 700, fontSize: "14px" }}>
                {transaction.label}
              </Box>
              <Box sx={{ color: "text.secondary", fontSize: "12px", mt: 0.25 }}>
                {formatTimestamp(transaction.timestamp)}
              </Box>
            </Box>
            <Box
              sx={{
                color: isCredit ? "#1F4D3A" : "#991B1B",
                fontWeight: 800,
                fontSize: "14px",
                whiteSpace: "nowrap",
              }}
            >
              {isCredit ? "+" : "−"}
              {transaction.amount} TR
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
};

export default TransactionList;
