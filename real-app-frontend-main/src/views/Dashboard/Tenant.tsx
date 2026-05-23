// React Imports
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
// MUI Imports
import { Box, Typography } from "@mui/material";
// Hook Imports
import useTypedSelector from "../../hooks/useTypedSelector";
// Redux Imports
import {
  useDeleteSavedSearchMutation,
  useGetMeQuery,
  useGetMySavedSearchesQuery,
} from "../../redux/api/userApiSlice";
import { useGetMyEngagementsQuery } from "../../redux/api/engagementApiSlice";
import { useInitiateTenantPremiumMutation } from "../../redux/api/paymentApiSlice";
import {
  selectedUserName,
  selectedUserPremiumExpiry,
  setUser,
} from "../../redux/auth/authSlice";
// Config Imports
import { isPremiumTenant } from "../../config/monetization";
import { getGreeting } from "../../utils/greeting";
// Component Imports
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import PrimaryInput from "../../components/PrimaryInput/PrimaryInput";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import { Heading, SubHeading } from "../../components/Heading";
import DotLoader from "../../components/Spinner/dotLoader";
import WalletCard from "../../components/wallet/WalletCard";
import TransactionList from "../../components/wallet/TransactionList";

const getEngagementStatusBadge = (status: string) => {
  const styles =
    status === "APPROVED"
      ? { background: "#D1EAE0", color: "#1F4D3A", label: "Approved" }
      : status === "DECLINED"
      ? { background: "#FEE2E2", color: "#991B1B", label: "Declined" }
      : { background: "#FEF3C7", color: "#92400E", label: "Pending" };

  return (
    <Box
      sx={{
        background: styles.background,
        color: styles.color,
        borderRadius: "999px",
        padding: "5px 10px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
      }}
    >
      {styles.label}
    </Box>
  );
};

const TenantDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const premiumExpiry = useTypedSelector(selectedUserPremiumExpiry);
  const userName = useTypedSelector(selectedUserName);
  const authUser = useTypedSelector((state) => state.auth?.user);
  const [recentlyViewed, setRecentlyViewed] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPolling, setShowPolling] = useState(false);
  const [phone, setPhone] = useState("");
  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });

  const { data: getMeData } = useGetMeQuery(undefined, {
    pollingInterval: showPolling ? 5000 : 0,
  });
  const {
    data: savedSearchesData,
    isLoading: savedSearchesLoading,
    refetch: refetchSavedSearches,
  } =
    useGetMySavedSearchesQuery(undefined);
  const { data: engagementsData, isLoading: engagementsLoading } =
    useGetMyEngagementsQuery(undefined);

  const [deleteSavedSearch, { isLoading: isDeletingSavedSearch }] =
    useDeleteSavedSearchMutation();
  const [initiateTenantPremium, { isLoading: isInitiatingPremium }] =
    useInitiateTenantPremiumMutation();

  const premiumAmountRaw = process.env.REACT_APP_TENANT_PREMIUM_AMOUNT || "10";
  const premiumAmountNumber = Number(premiumAmountRaw);
  const premiumAmountDisplay = Number.isFinite(premiumAmountNumber)
    ? premiumAmountNumber.toFixed(2)
    : "10.00";
  const premiumActive = isPremiumTenant({ premiumExpiry });
  const engagements = engagementsData?.data || [];
  const approvedEngagements = engagements.filter(
    (engagement: any) => engagement.status === "APPROVED"
  );
  const pendingEngagements = engagements.filter(
    (engagement: any) => engagement.status === "PENDING"
  );
  const daysRemaining = premiumExpiry
    ? Math.ceil((new Date(premiumExpiry).getTime() - Date.now()) / 86_400_000)
    : null;
  const showRenew =
    premiumActive && daysRemaining !== null && daysRemaining <= 7;
  const formattedPremiumExpiry = premiumExpiry
    ? new Date(premiumExpiry).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

  useEffect(() => {
    const stored = localStorage.getItem("tr_recently_viewed");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      setRecentlyViewed(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecentlyViewed([]);
    }
  }, []);

  useEffect(() => {
    if (!showPolling) return;

    const updatedUser = getMeData?.data?.user;
    if (!updatedUser) return;

    const previousExpiryMs = premiumExpiry
      ? new Date(premiumExpiry).getTime()
      : 0;
    const updatedExpiryMs = updatedUser?.premiumExpiry
      ? new Date(updatedUser.premiumExpiry).getTime()
      : 0;

    const hasExpiryUpdate =
      updatedExpiryMs > Date.now() &&
      updatedExpiryMs > previousExpiryMs &&
      updatedExpiryMs !== previousExpiryMs;

    if (hasExpiryUpdate) {
      const nextAuthUser = {
        ...authUser,
        data: {
          ...(authUser?.data || {}),
          user: updatedUser,
        },
      };

      dispatch(setUser(nextAuthUser));
      localStorage.setItem("user", JSON.stringify(nextAuthUser));

      setShowPolling(false);
      setShowPaymentForm(false);
      setPhone("");
      setToast({
        message: "Premium activated!",
        appearence: true,
        type: "success",
      });
    }
  }, [getMeData, showPolling, premiumExpiry, authUser, dispatch]);

  const handleCloseToast = () => {
    setToast({ ...toast, appearence: false });
  };

  const handleInitiatePremium = async () => {
    try {
      const result: any = await initiateTenantPremium({ phone });

      if (result?.error) {
        setToast({
          message:
            result?.error?.data?.message ||
            result?.error?.message ||
            "Failed to initiate premium payment",
          appearence: true,
          type: "error",
        });
        return;
      }

      setShowPolling(true);
      setToast({
        message: "Payment request sent. Approve the prompt on your phone.",
        appearence: true,
        type: "info",
      });
    } catch (error) {
      console.error("Initiate Tenant Premium Error", error);
      setToast({
        message: "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  const handleDeleteSavedSearch = async (id: string) => {
    try {
      await deleteSavedSearch(id).unwrap();
      await refetchSavedSearches();
      setToast({
        message: "Saved search deleted successfully",
        appearence: true,
        type: "success",
      });
    } catch (error) {
      console.error("Delete Saved Search Error", error);
      setToast({
        message:
          (error as any)?.data?.message ||
          (error as any)?.message ||
          "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  return (
    <Box sx={{ background: "background.default", minHeight: "100vh" }}>
      <Box sx={{ background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)", pt: { xs: 8, md: 10 }, pb: { xs: 8, md: 10 }, px: 3, mb: -6 }}>
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <Box sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 800, color: "#fff" }}>{getGreeting(userName)}</Box>
          <Box sx={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", mt: 1 }}>Here's what's happening with your account</Box>
        </Box>
      </Box>
      <AppContainer sx={{ pb: { xs: 4, md: 6 } }}>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          {[
            { label: "Landlords Contacted", value: engagements.length },
            { label: "Approved", value: approvedEngagements.length },
            { label: "Pending", value: pendingEngagements.length },
            { label: "Properties Viewed", value: recentlyViewed.length },
          ].map((stat) => (
            <AppCard
              key={stat.label}
              sx={{
                p: 2,
                textAlign: "center",
                borderLeft: "3px solid #1F4D3A",
                transition: "box-shadow 0.2s ease",
                "&:hover": { boxShadow: "0 8px 24px rgba(31,77,58,0.15)" },
              }}
            >
              <Box sx={{ color: "#1F4D3A", fontSize: "28px", fontWeight: 800 }}>
                {stat.value}
              </Box>
              <Box sx={{ color: "text.secondary", fontSize: "12px" }}>
                {stat.label}
              </Box>
            </AppCard>
          ))}
        </Box>

        <AppCard
          sx={{
            mt: "20px",
            p: { xs: 2, md: 2.5 },
            ...(premiumActive ? { borderLeft: "4px solid #B8975A" } : {}),
          }}
        >
          <Heading sx={{ fontSize: "20px", mb: 2 }}>Premium Membership</Heading>
          {premiumActive ? (
            <Box sx={{ marginTop: "12px" }}>
              <Box sx={{ display: "inline-block", background: "#D1EAE0", color: "#1F4D3A", borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 700, mb: 1.5 }}>
                Premium Active
              </Box>
              <SubHeading sx={{ color: "text.secondary", marginBottom: "14px" }}>
                Active until: {formattedPremiumExpiry}
              </SubHeading>
              <SubHeading sx={{ color: "text.secondary", marginBottom: "14px" }}>
                {daysRemaining !== null
                  ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`
                  : "Expiry not available"}
              </SubHeading>
              {showRenew ? (
                <AppButton onClick={() => setShowPaymentForm(true)}>
                  Renew Premium
                </AppButton>
              ) : null}
            </Box>
          ) : (
            <Box sx={{ marginTop: "12px" }}>
              <Box sx={{ display: "inline-block", background: "#F1F5F9", color: "#64748B", borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 700, mb: 1.5 }}>
                No Premium
              </Box>
              <SubHeading sx={{ color: "text.secondary", marginBottom: "14px" }}>
                Upgrade to Premium for early access to new listings.
              </SubHeading>
              {!showPaymentForm ? (
                <AppButton onClick={() => setShowPaymentForm(true)}>
                  Upgrade to Premium
                </AppButton>
              ) : null}
            </Box>
          )}
          {showPaymentForm ? (
            <Box sx={{ marginTop: "12px" }}>
              <SubHeading sx={{ color: "text.secondary", marginBottom: "10px" }}>
                Premium price: USD {premiumAmountDisplay}
              </SubHeading>
              <SubHeading sx={{ color: "text.secondary", marginBottom: "10px" }}>
                Duration: 30-day membership
              </SubHeading>
              {showPolling ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    py: 1,
                  }}
                >
                  <DotLoader color="#B8975A" size={14} />
                  <SubHeading sx={{ color: "text.secondary", fontSize: "13px", textAlign: "center" }}>
                    Waiting for payment confirmation. Checking every 5 seconds...
                  </SubHeading>
                </Box>
              ) : null}
              {!showPolling ? (
                <>
                  <Box sx={{ mt: 1.5 }}>
                    <PrimaryInput
                      label="Your EcoCash Number"
                      type="tel"
                      placeholder="+263 77 123 4567"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </Box>
                  <Box sx={{ mt: 1.5, display: "flex", gap: 1 }}>
                    <AppButton
                      onClick={handleInitiatePremium}
                      disabled={isInitiatingPremium}
                    >
                      Send Payment Request
                    </AppButton>
                    <AppButton
                      variant="outlined"
                      onClick={() => {
                        setShowPaymentForm(false);
                        setShowPolling(false);
                      }}
                    >
                      Cancel
                    </AppButton>
                  </Box>
                </>
              ) : null}
            </Box>
          ) : null}
        </AppCard>

        <AppCard sx={{ mt: "20px", p: { xs: 2, md: 2.5 } }}>
          <WalletCard />
          <Box sx={{ mt: 2 }}>
            <Heading sx={{ fontSize: "20px", mb: 2 }}>Transactions</Heading>
            <TransactionList maxItems={5} />
          </Box>
        </AppCard>

        <AppCard sx={{ mt: "20px", p: { xs: 2, md: 2.5 } }}>
          <Heading sx={{ fontSize: "20px", mb: 2 }}>
            Saved Searches
          </Heading>
          {savedSearchesLoading ? (
            <SubHeading sx={{ color: "text.secondary" }}>
              Loading saved searches...
            </SubHeading>
          ) : savedSearchesData?.data?.length === 0 ? (
            <SubHeading sx={{ color: "text.secondary" }}>
              No saved searches yet. Use the search page to save a search.
            </SubHeading>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {savedSearchesData?.data?.map((search: any) => (
                <AppCard
                  key={search?._id}
                  elevation="flat"
                  interactive
                  sx={{
                    p: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      {search?.name || "Saved Search"}
                    </Typography>
                    <SubHeading sx={{ color: "text.secondary", fontSize: "13px" }}>
                      Location: {search?.criteria?.location || "Any location"} | Rent:{" "}
                      {search?.criteria?.minRent && search?.criteria?.maxRent
                        ? `${search.criteria.minRent} - ${search.criteria.maxRent}`
                        : search?.criteria?.minRent
                        ? `Min ${search.criteria.minRent}`
                        : search?.criteria?.maxRent
                        ? `Max ${search.criteria.maxRent}`
                        : "Any"}{" "}
                      | Min beds: {search?.criteria?.minBedrooms || "Any"} | Amenities:{" "}
                      {Object.keys(search?.criteria?.amenities || {})
                        .filter((key) => search?.criteria?.amenities?.[key] === true)
                        .join(", ") || "None"}
                    </SubHeading>
                    <SubHeading sx={{ color: "text.secondary", fontSize: "13px" }}>
                      Last notified:{" "}
                      {search?.lastNotifiedAt
                        ? new Date(search.lastNotifiedAt).toLocaleString()
                        : "Never"}
                    </SubHeading>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <AppButton
                      size="small"
                      variant="outlined"
                      onClick={() => navigate("/search")}
                    >
                      View
                    </AppButton>
                    <AppButton
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={isDeletingSavedSearch}
                      onClick={() => handleDeleteSavedSearch(search?._id)}
                    >
                      Delete
                    </AppButton>
                  </Box>
                </AppCard>
              ))}
            </Box>
          )}
        </AppCard>

        <AppCard sx={{ mt: "20px", p: { xs: 2, md: 2.5 } }}>
          <Heading sx={{ fontSize: "20px", mb: 2 }}>
            My Engagement Requests
          </Heading>
          {engagementsLoading ? (
            <SubHeading sx={{ color: "text.secondary" }}>Loading...</SubHeading>
          ) : engagements.length === 0 ? (
            <SubHeading sx={{ color: "text.secondary" }}>
              No engagement requests yet. Browse listings and reach out to
              landlords.
            </SubHeading>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {engagements.map((engagement: any) => (
                <AppCard
                  key={engagement.id}
                  elevation="flat"
                  interactive
                  sx={{
                    p: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                  }}
                  onClick={() => navigate(`/listing/${engagement.listing?.id}`)}
                >
                  <Box>
                    <Box sx={{ fontWeight: 700, cursor: "pointer" }}>
                      {engagement.listing?.name || "Listing"}
                    </Box>
                    <Box sx={{ fontSize: "12px", color: "text.secondary" }}>
                      Sent {new Date(engagement.createdAt).toLocaleString()}
                    </Box>
                  </Box>
                  {getEngagementStatusBadge(engagement.status)}
                </AppCard>
              ))}
            </Box>
          )}
        </AppCard>

        {approvedEngagements.length > 0 ? (
          <AppCard sx={{ mt: "20px", p: { xs: 2, md: 2.5 } }}>
            <Heading sx={{ fontSize: "20px", mb: 2 }}>Approved Contacts</Heading>
            {approvedEngagements.map((engagement: any) => (
              <AppCard
                key={engagement.id}
                elevation="flat"
                sx={{
                  borderLeft: "3px solid #1F4D3A",
                  p: "14px 16px",
                  mb: 1,
                }}
              >
                <Box sx={{ fontWeight: 700 }}>
                  {engagement.listing?.name || "Listing"}
                </Box>
                <Box sx={{ fontSize: "13px", color: "#1F4D3A", mt: 0.5 }}>
                  Address: {engagement.listing?.address || "Unavailable"}
                </Box>
                <Box sx={{ fontSize: "13px", color: "text.secondary", mt: 0.5 }}>
                  Phone: {engagement.listing?.phoneNumber || "Unavailable"}
                </Box>
              </AppCard>
            ))}
          </AppCard>
        ) : null}

        {recentlyViewed.length > 0 ? (
          <AppCard sx={{ mt: "20px", p: { xs: 2, md: 2.5 } }}>
            <Heading sx={{ fontSize: "20px", mb: 2 }}>Recently Viewed</Heading>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {recentlyViewed.slice(0, 5).map((item) => (
                <AppButton
                  key={item.id}
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/listing/${item.id}`)}
                >
                  {item.name}
                </AppButton>
              ))}
            </Box>
          </AppCard>
        ) : null}
      </AppContainer>

      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
    </Box>
  );
};

export default TenantDashboard;
