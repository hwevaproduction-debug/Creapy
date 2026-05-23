import React, { useLayoutEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import Home from "./views/Home";
import NotFound from "./views/NotFound";
import Login from "./views/Login";
import SignUp from "./views/SignUp";
import ForgotPassword from "./views/ForgotPassword";
import ResetPassword from "./views/ResetPassword";
import Profile from "./views/Profile";
import About from "./views/About";
import Header from "./components/Header";
import PublicRoutes from "./routes/PublicRoutes";
import ProtectedRoutes from "./routes/ProtectedRoutes";
import CreateListing from "./views/Listing";
import ViewListing from "./views/Listing/components/viewListing";
import SearchPage from "./views/Search";
import SavedSearches from "./views/SavedSearches";
import Notifications from "./views/Notifications";
import LandlordDashboard from "./views/Dashboard/Landlord";
import ProviderDashboardShell from "./views/Dashboard/provider/ProviderDashboardShell";
import TenantDashboard from "./views/Dashboard/Tenant";
import ListingPayment from "./views/Dashboard/Payment";
import AdminDashboard from "./views/Dashboard/Admin";
import VerifyEmail from "./views/VerifyEmail";
import VerifyPhone from "./views/VerifyPhone";
import Stays from "./views/Stays";
import StayRoomDetail from "./views/Stays/RoomDetail";
import BookingConfirmation from "./views/Stays/BookingConfirmation";
import MyStayBookings from "./views/Stays/MyBookings";
import ProviderSignUp from "./views/ProviderSignUp";
import TermsOfUse from "./views/Legal/TermsOfUse";
import PrivacyPolicy from "./views/Legal/PrivacyPolicy";
import LandlordTerms from "./views/Legal/LandlordTerms";
import RefundPolicy from "./views/Legal/RefundPolicy";
import CommunityGuidelines from "./views/Legal/CommunityGuidelines";
import TrustSafety from "./views/Legal/TrustSafety";
import Footer from "./components/Footer";
import { createAppTheme } from "./theme";

export const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

const AUTH_FOOTER_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/provider-signup",
  "/verify-email",
  "/verify-phone",
];

const AppFooter = () => {
  const location = useLocation();
  if (AUTH_FOOTER_PATHS.some((path) => location.pathname.startsWith(path))) {
    return null;
  }
  return <Footer />;
};

const getInitialColorMode = (): "light" | "dark" => {
  const storedMode = localStorage.getItem("colorMode");

  return storedMode === "dark" ? "dark" : "light";
};

function App() {
  const [mode, setMode] = useState<"light" | "dark">(getInitialColorMode);
  const colorModeValue = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prev) => {
          const next = prev === "light" ? "dark" : "light";
          localStorage.setItem("colorMode", next);
          return next;
        });
      },
    }),
    []
  );
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-color-scheme", mode);
  }, [mode]);

  return (
    <ColorModeContext.Provider value={colorModeValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Header />
          <Routes>
            <Route
              path="/signup"
              element={
                <PublicRoutes>
                  <SignUp />
                </PublicRoutes>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoutes>
                  <Login />
                </PublicRoutes>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoutes>
                  <ForgotPassword />
                </PublicRoutes>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoutes>
                  <ResetPassword />
                </PublicRoutes>
              }
            />
            <Route
              path="/provider-signup"
              element={
                <PublicRoutes>
                  <ProviderSignUp />
                </PublicRoutes>
              }
            />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-phone" element={<VerifyPhone />} />
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/landlord-terms" element={<LandlordTerms />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/trust-safety" element={<TrustSafety />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/stays" element={<Stays />} />
            <Route path="/stays/rooms/:roomId" element={<StayRoomDetail />} />
            <Route path="/listing/:id" element={<ViewListing />} />
            {/* Protected Routes */}
            <Route
              path="/saved-searches"
              element={
                <ProtectedRoutes>
                  <SavedSearches />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoutes>
                  <Profile />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoutes>
                  <Notifications />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/stays/bookings/:id"
              element={
                <ProtectedRoutes>
                  <BookingConfirmation />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/stays/bookings"
              element={
                <ProtectedRoutes>
                  <MyStayBookings />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/dashboard/landlord"
              element={
                <ProtectedRoutes allowedRoles={["landlord"]}>
                  <LandlordDashboard />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/dashboard/provider"
              element={
                <ProtectedRoutes allowedRoles={["provider"]}>
                  <ProviderDashboardShell />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/dashboard/tenant"
              element={
                <ProtectedRoutes allowedRoles={["tenant"]}>
                  <TenantDashboard />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoutes allowedRoles={["admin", "super_admin"]}>
                  <AdminDashboard />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/create-listing"
              element={
                <ProtectedRoutes allowedRoles={["landlord"]}>
                  <CreateListing />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/listings/:id/pay"
              element={
                <ProtectedRoutes allowedRoles={["landlord"]}>
                  <ListingPayment />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/listings"
              element={
                <ProtectedRoutes allowedRoles={["landlord"]}>
                  <Navigate to="/dashboard/landlord" replace />
                </ProtectedRoutes>
              }
            />
            <Route
              path="/listings/:id"
              element={
                <ProtectedRoutes allowedRoles={["landlord"]}>
                  <CreateListing />
                </ProtectedRoutes>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AppFooter />
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
