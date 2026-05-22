import { Box, Skeleton } from "@mui/material";
import { Bell } from "lucide-react";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";
import { Heading, SubHeading } from "../../components/Heading";
import {
  useGetNotificationsQuery,
  useMarkAllAsReadMutation,
} from "../../redux/api/notificationApiSlice";

const Notifications = () => {
  const { data, isLoading } = useGetNotificationsQuery({ page: 1, limit: 50 });
  const [markAllAsRead, { isLoading: markingAllRead }] =
    useMarkAllAsReadMutation();
  const notifications = data?.data || [];
  const hasUnread = notifications.some((notification) => !notification.isRead);

  return (
    <Box sx={{ mt: { xs: 5, md: 6 } }}>
      <AppContainer>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 3,
          }}
        >
          <Heading>Notifications</Heading>
          <AppButton
            variant="outlined"
            size="small"
            disabled={!hasUnread || markingAllRead}
            onClick={() => markAllAsRead()}
          >
            Mark all as read
          </AppButton>
        </Box>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <AppCard key={index} sx={{ mb: 1.5, p: "16px 20px" }}>
              <Skeleton width="45%" />
              <Skeleton width="80%" />
              <Skeleton width="25%" />
            </AppCard>
          ))
        ) : notifications.length === 0 ? (
          <Box
            sx={{
              minHeight: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <Box>
              <Bell size={44} color="#B8975A" />
              <Heading sx={{ fontSize: "20px", mt: 1.5 }}>
                You're all caught up
              </Heading>
              <SubHeading sx={{ color: "text.secondary", mt: 0.5 }}>
                No notifications yet. Engage with listings to get started.
              </SubHeading>
            </Box>
          </Box>
        ) : (
          notifications.map((notification) => (
            <AppCard
              key={notification.id}
              sx={{
                mb: 1.5,
                p: "16px 20px",
                borderLeft: notification.isRead ? "none" : "3px solid #B8975A",
                opacity: notification.isRead ? 0.75 : 1,
              }}
            >
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: notification.isRead ? "#E2E8F0" : "#B8975A",
                    mt: 0.6,
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Box sx={{ fontWeight: 700, fontSize: "14px" }}>
                    {notification.title}
                  </Box>
                  <Box
                    sx={{
                      fontSize: "13px",
                      color: "text.secondary",
                      mt: 0.5,
                    }}
                  >
                    {notification.body}
                  </Box>
                  <Box sx={{ fontSize: "11px", color: "#94A3B8", mt: 0.75 }}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </Box>
                </Box>
              </Box>
            </AppCard>
          ))
        )}
      </AppContainer>
    </Box>
  );
};

export default Notifications;
