// MUI Imports
import { Box, Grid, Menu, MenuItem, Skeleton, useTheme } from "@mui/material";
// React Imports
import { useEffect, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
// Custom Imports
import { Heading, SubHeading } from "../../components/Heading";
// Swiper Imports
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css/free-mode";
import "swiper/css";
import "swiper/css/pagination";
import {
  useGetHomeGroupedByLocationQuery,
  useGetHomeHighlightedQuery,
} from "../../redux/api/listingApiSlice";
import OverlayLoader from "../../components/Spinner/OverlayLoader";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import AppInput from "../../components/ui/AppInput";
import useTypedSelector from "../../hooks/useTypedSelector";
import { ZIMBABWE_PROVINCES } from "../../config/zimbabweProvinces";
import {
  selectedUserRole,
  selectedUserToken,
} from "../../redux/auth/authSlice";
import { studentAccommodationOverlayBadgeSx } from "../../styles/listingBadges";
import { thousandSeparatorNumber } from "../../utils";

type SearchTab = "rent" | "stays" | "student";

const filterButtonSx = {
  background: "#F7EDDA",
  color: "#7D6234",
  borderRadius: "999px",
  padding: "8px 16px",
  fontSize: "13px",
  cursor: "pointer",
  border: "1px solid #EDD9B0",
  fontWeight: 600,
  "&:hover": {
    background: "#EDD9B0",
  },
};

const categoryChips = [
  { label: "🏠 All Rentals", path: "/search" },
  { label: "🎓 Student Accommodation", path: "/search?studentAccommodation=true" },
  { label: "⚡ Solar Powered", path: "/search?solar=true" },
  { label: "🅿 With Parking", path: "/search?parking=true" },
  { label: "🛋 Furnished", path: "/search?furnished=true" },
  { label: "💧 Borehole Water", path: "/search?borehole=true" },
  { label: "🔒 Gated/Security", path: "/search?security=true" },
  { label: "🌐 Internet Ready", path: "/search?internet=true" },
];

const trustStats = [
  { value: "2,000+", label: "Active Listings" },
  { value: "10", label: "Provinces Covered" },
  { value: "500+", label: "Verified Landlords" },
  { value: "4.8★", label: "Average Rating" },
];

const amenityLabels = [
  { key: "solar", label: "Solar" },
  { key: "parking", label: "Parking" },
  { key: "furnished", label: "Furnished" },
  { key: "borehole", label: "Borehole" },
  { key: "security", label: "Security" },
  { key: "internet", label: "Internet" },
];

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const token = useTypedSelector(selectedUserToken);
  const userRole = useTypedSelector(selectedUserRole);
  const isAuthenticated = Boolean(token);
  const [heroSearch, setHeroSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("rent");
  const [locationAnchor, setLocationAnchor] = useState<null | HTMLElement>(null);
  const [roomsAnchor, setRoomsAnchor] = useState<null | HTMLElement>(null);
  const [priceAnchor, setPriceAnchor] = useState<null | HTMLElement>(null);
  const [amenitiesAnchor, setAmenitiesAnchor] = useState<null | HTMLElement>(null);

  const { data: highlightedData, isLoading: highlightedLoading } =
    useGetHomeHighlightedQuery(6);
  const {
    data: groupedByLocationData,
    isLoading: groupedByLocationLoading,
  } = useGetHomeGroupedByLocationQuery({ locationsLimit: 6, perLocation: 3 });

  const highlightedListings = (highlightedData?.data || []).slice(0, 6);
  const groupedSlides = groupedByLocationData?.data || [];

  const getListingImage = (item: any) =>
    item?.image || item?.images?.[0] || item?.imageUrls?.[0] || null;

  const getAmenityLabel = (item: any) => {
    const amenities = item?.amenities || {};
    const match = amenityLabels.find(({ key }) => item?.[key] || amenities?.[key]);
    return match?.label || "Verified";
  };

  // Never block the whole landing page forever.
  // If the API is down or DB isn't connected, show the page and allow retry.
  const [showOverlay, setShowOverlay] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const anyLoading = highlightedLoading || groupedByLocationLoading;
    if (!anyLoading) {
      setShowOverlay(false);
      setTimedOut(false);
      return;
    }

    const t1 = window.setTimeout(() => setShowOverlay(true), 250);
    const t2 = window.setTimeout(() => {
      setShowOverlay(false);
      setTimedOut(true);
    }, 8000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [highlightedLoading, groupedByLocationLoading]);

  const navigateToSearch = (params: Record<string, string>) => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, value);
      }
    });
    navigate(`/search?${urlParams.toString()}`);
  };

  const handleTabClick = (tab: SearchTab) => {
    setActiveTab(tab);
    if (tab === "stays") {
      navigate("/stays");
      return;
    }
    if (tab === "student") {
      navigate("/search?studentAccommodation=true");
    }
  };

  const handleHeroSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!heroSearch.trim()) {
      navigate("/search");
      return;
    }
    const urlParams = new URLSearchParams();
    urlParams.set("searchTerm", heroSearch.trim().toLowerCase());
    navigate(`/search?${urlParams.toString()}`);
  };

  const getAuthenticatedListPropertyPath = () => {
    if (userRole === "landlord") {
      return "/create-listing";
    }

    if (userRole === "provider") {
      return "/dashboard/provider";
    }

    if (userRole === "admin" || userRole === "super_admin") {
      return "/dashboard/admin";
    }

    if (userRole === "tenant") {
      return "/dashboard/tenant";
    }

    return "/profile";
  };

  const handleListPropertyClick = () => {
    navigate(
      isAuthenticated ? getAuthenticatedListPropertyPath() : "/provider-signup"
    );
  };

  const renderPropertyBadge = (item: any) => {
    if (item?.status === "early_access") {
      return (
        <Box
          sx={{
            background: "#FDF8F0",
            color: "#9E7E45",
            fontSize: "11px",
            fontWeight: 700,
            borderRadius: "999px",
            padding: "5px 11px",
            display: "inline-block",
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          Early Access
        </Box>
      );
    }

    if (item?.studentAccommodation) {
      return (
        <Box
          sx={{
            ...studentAccommodationOverlayBadgeSx,
            background: "#D1EAE0",
            color: "#1F4D3A",
            padding: "5px 11px",
            top: 12,
            left: 12,
          }}
        >
          Student Accommodation
        </Box>
      );
    }

    return null;
  };

  const renderPropertyCard = (item: any) => (
    <Box
      onClick={() => navigate(`/listing/${item?._id}`)}
      sx={{
        cursor: "pointer",
        borderRadius: "16px",
        overflow: "hidden",
        background: "background.paper",
        boxShadow: "0 4px 16px rgba(31,41,55,0.08)",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 16px 48px rgba(31,41,55,0.16)",
        },
        "&:hover .listing-image": {
          transform: "scale(1.06)",
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: 220,
          overflow: "hidden",
          background: "#E2E8F0",
        }}
      >
        {getListingImage(item) ? (
          <Box
            component="img"
            className="listing-image"
            src={getListingImage(item)}
            alt={item?.name || "listing"}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.4s ease",
            }}
          />
        ) : null}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "40%",
            background: "linear-gradient(to top, rgba(31,41,55,0.5), transparent)",
            pointerEvents: "none",
          }}
        />
        {renderPropertyBadge(item)}
        <Box
          component="button"
          type="button"
          aria-label="Save property"
          onClick={(e: MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            cursor: "pointer",
            border: "none",
            color: "#1F2937",
          }}
        >
          ♡
        </Box>
      </Box>
      <Box sx={{ padding: "16px 18px 18px" }}>
        <Box
          sx={{
            fontSize: "22px",
            fontWeight: 800,
            color: "text.primary",
            marginBottom: 0.5,
          }}
        >
          ${thousandSeparatorNumber(Number(item?.monthlyRent || item?.regularPrice || 0))}{" "}
          /month
        </Box>
        <Box
          sx={{
            fontSize: "15px",
            fontWeight: 600,
            color: "text.primary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 0.75,
          }}
        >
          {item?.name || "Property listing"}
        </Box>
        <Box
          sx={{
            fontSize: "13px",
            color: "#475569",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 1.5,
          }}
        >
          📍 {item?.address || item?.province || "Zimbabwe"}
        </Box>
        <Box
          sx={{
            borderTop: "1px solid #E2E8F0",
            pt: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            fontSize: "12px",
            color: "#64748B",
          }}
        >
          <Box>{item?.totalRooms ?? item?.bedrooms ?? 1} Rooms</Box>
          <Box>{item?.bathrooms ?? 1} Baths</Box>
          <Box
            sx={{
              background: "#F7EDDA",
              color: "#7D6234",
              borderRadius: "999px",
              padding: "3px 9px",
              fontWeight: 700,
            }}
          >
            {getAmenityLabel(item)}
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ background: "background.default" }}>
      {showOverlay && <OverlayLoader />}
      {timedOut && (
        <AppContainer>
          <Box
            sx={{
              background: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "10px",
              padding: "12px 14px",
              color: "text.secondary",
              fontSize: "14px",
            }}
          >
            Listings are taking too long to load. Make sure the backend is running and
            MongoDB is connected, then refresh.
          </Box>
        </AppContainer>
      )}

      <Box
        sx={{
          width: "100%",
          minHeight: { xs: "70vh", md: "88vh" },
          background:
            "linear-gradient(135deg, #1F2937 0%, #1F4D3A 60%, #0D1117 100%)",
          display: "flex",
          alignItems: "center",
          pt: { xs: 12, md: 14 },
          pb: { xs: 6, md: 8 },
        }}
      >
        <AppContainer>
          <Box
            sx={{
              maxWidth: 680,
              mx: "auto",
              textAlign: "center",
              color: "#fff",
            }}
          >
            <Box
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#B8975A",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              ZIMBABWE&apos;S PREMIER PROPERTY PLATFORM
            </Box>
            <Box
              component="h1"
              sx={{
                fontSize: { xs: "2rem", md: "3.5rem" },
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#fff",
                margin: 0,
                marginBottom: 2.5,
                lineHeight: 1.05,
              }}
            >
              Find Your Perfect Home in Zimbabwe
            </Box>
            <Box
              sx={{
                fontSize: "1.1rem",
                opacity: 0.82,
                marginBottom: 4,
                lineHeight: 1.6,
              }}
            >
              Explore thousands of verified rentals, student accommodation, and
              temporary stays across all provinces
            </Box>

            <AppCard
              sx={{
                borderRadius: "20px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
                p: { xs: 2.5, md: 3 },
                marginBottom: 3,
              }}
            >
              <Box component="form" onSubmit={handleHeroSubmit}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginBottom: 2.5,
                  }}
                >
                  {[
                    { label: "Rent", value: "rent" },
                    { label: "Stays", value: "stays" },
                    { label: "Student", value: "student" },
                  ].map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                      <Box
                        key={tab.value}
                        component="button"
                        type="button"
                        onClick={() => handleTabClick(tab.value as SearchTab)}
                        sx={{
                          background: isActive ? "#B8975A" : "transparent",
                          color: isActive ? "#fff" : "#475569",
                          border: isActive ? "1.5px solid #B8975A" : "1.5px solid #E2E8F0",
                          borderRadius: "999px",
                          padding: "8px 18px",
                          fontSize: "14px",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {tab.label}
                      </Box>
                    );
                  })}
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 1.5,
                    alignItems: "center",
                  }}
                >
                  <AppInput
                    placeholder="Search by location, address, or keyword"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    sx={{
                      "& .MuiInputBase-root": {
                        height: 56,
                        borderRadius: "14px",
                      },
                    }}
                  />
                  <AppButton
                    type="submit"
                    sx={{
                      flexShrink: 0,
                      width: { xs: "100%", sm: "auto" },
                      height: 56,
                      borderRadius: "14px",
                      background: "#B8975A",
                    }}
                  >
                    Search
                  </AppButton>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, marginTop: 2 }}>
                  <Box
                    component="button"
                    type="button"
                    onClick={(e: MouseEvent<HTMLElement>) =>
                      setLocationAnchor(e.currentTarget)
                    }
                    sx={filterButtonSx}
                  >
                    Location
                  </Box>
                  <Menu
                    anchorEl={locationAnchor}
                    open={Boolean(locationAnchor)}
                    onClose={() => setLocationAnchor(null)}
                  >
                    {ZIMBABWE_PROVINCES.map((province) => (
                      <MenuItem
                        key={province.value}
                        onClick={() => {
                          setLocationAnchor(null);
                          navigateToSearch({ province: province.value });
                        }}
                      >
                        {province.label}
                      </MenuItem>
                    ))}
                  </Menu>
                  <Box
                    component="button"
                    type="button"
                    onClick={(e: MouseEvent<HTMLElement>) =>
                      setRoomsAnchor(e.currentTarget)
                    }
                    sx={filterButtonSx}
                  >
                    Rooms
                  </Box>
                  <Menu
                    anchorEl={roomsAnchor}
                    open={Boolean(roomsAnchor)}
                    onClose={() => setRoomsAnchor(null)}
                  >
                    {[1, 2, 3, 4, 5, 6].map((rooms) => (
                      <MenuItem
                        key={rooms}
                        onClick={() => {
                          setRoomsAnchor(null);
                          navigateToSearch({ minTotalRooms: String(rooms) });
                        }}
                      >
                        {rooms}+ rooms
                      </MenuItem>
                    ))}
                  </Menu>
                  <Box
                    component="button"
                    type="button"
                    onClick={(e: MouseEvent<HTMLElement>) =>
                      setPriceAnchor(e.currentTarget)
                    }
                    sx={filterButtonSx}
                  >
                    Price
                  </Box>
                  <Menu
                    anchorEl={priceAnchor}
                    open={Boolean(priceAnchor)}
                    onClose={() => setPriceAnchor(null)}
                  >
                    {[
                      { label: "Under $200", query: "maxRent=200" },
                      { label: "$200 - $500", query: "minRent=200&maxRent=500" },
                      { label: "$500 - $1,000", query: "minRent=500&maxRent=1000" },
                      { label: "$1,000 - $2,000", query: "minRent=1000&maxRent=2000" },
                      { label: "Over $2,000", query: "minRent=2000" },
                    ].map((band) => (
                      <MenuItem
                        key={band.label}
                        onClick={() => {
                          setPriceAnchor(null);
                          navigate(`/search?${band.query}`);
                        }}
                      >
                        {band.label}
                      </MenuItem>
                    ))}
                  </Menu>
                  <Box
                    component="button"
                    type="button"
                    onClick={(e: MouseEvent<HTMLElement>) =>
                      setAmenitiesAnchor(e.currentTarget)
                    }
                    sx={filterButtonSx}
                  >
                    Amenities
                  </Box>
                  <Menu
                    anchorEl={amenitiesAnchor}
                    open={Boolean(amenitiesAnchor)}
                    onClose={() => setAmenitiesAnchor(null)}
                  >
                    {[
                      { label: "Solar", query: "solar=true" },
                      { label: "Borehole", query: "borehole=true" },
                      { label: "Security", query: "security=true" },
                      { label: "Parking", query: "parking=true" },
                      { label: "Internet", query: "internet=true" },
                    ].map((amenity) => (
                      <MenuItem
                        key={amenity.label}
                        onClick={() => {
                          setAmenitiesAnchor(null);
                          navigate(`/search?${amenity.query}`);
                        }}
                      >
                        {amenity.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
              </Box>
            </AppCard>

            <Box sx={{ fontSize: "13px", color: "rgba(255,255,255,0.65)" }}>
              2,000+ Listings · 10 Provinces · Verified Landlords
            </Box>
          </Box>
        </AppContainer>
      </Box>

      <AppContainer sx={{ py: { xs: 6, md: 8 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            marginBottom: 3,
          }}
        >
          <Heading>Featured Properties</Heading>
          <AppButton variant="text" onClick={() => navigate("/search")}>
            View all →
          </AppButton>
        </Box>

        <Grid container spacing={3}>
          {highlightedLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Box
                    sx={{
                      borderRadius: "16px",
                      overflow: "hidden",
                      background: "background.paper",
                      boxShadow: "0 4px 16px rgba(31,41,55,0.08)",
                    }}
                  >
                    <Skeleton
                      variant="rectangular"
                      height={220}
                      sx={{ borderRadius: "16px 16px 0 0" }}
                    />
                    <Skeleton variant="text" width="60%" sx={{ mt: 2, ml: 2 }} />
                    <Skeleton variant="text" width="40%" sx={{ ml: 2, mb: 2 }} />
                  </Box>
                </Grid>
              ))
            : highlightedListings.map((item: any) => (
                <Grid item xs={12} sm={6} md={4} key={item?._id}>
                  {renderPropertyCard(item)}
                </Grid>
              ))}
        </Grid>
      </AppContainer>

      <AppContainer sx={{ pb: { xs: 6, md: 8 } }}>
        <Box sx={{ marginBottom: 3 }}>
          <Heading>Browse By Location</Heading>
          <SubHeading sx={{ marginTop: 0.75 }}>
            Explore properties across Zimbabwe&apos;s provinces
          </SubHeading>
        </Box>
        <Grid container spacing={2}>
          {ZIMBABWE_PROVINCES.map((province) => {
            const isPopular = ["Harare", "Bulawayo"].includes(province.value);
            return (
              <Grid item xs={6} sm={4} md={3} lg={2} key={province.value}>
                <Box
                  onClick={() => navigate(`/search?province=${province.value}`)}
                  sx={{
                    height: 100,
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    background: isPopular
                      ? "linear-gradient(135deg, #B8975A, #7D6234)"
                      : "linear-gradient(135deg, #1F4D3A, #1F2937)",
                    transition: "all 0.2s",
                    px: 1.5,
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: "0 12px 32px rgba(31,41,55,0.2)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "14px",
                      textAlign: "center",
                    }}
                  >
                    {province.label}
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </AppContainer>

      <AppContainer sx={{ pb: { xs: 6, md: 8 } }}>
        <Heading sx={{ marginBottom: 3 }}>Popular Categories</Heading>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {categoryChips.map((category) => (
            <Box
              key={category.path}
              component="button"
              type="button"
              onClick={() => navigate(category.path)}
              sx={{
                background: "#F7EDDA",
                color: "#7D6234",
                border: "1px solid #EDD9B0",
                borderRadius: "999px",
                padding: "8px 18px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": {
                  background: "#EDD9B0",
                },
              }}
            >
              {category.label}
            </Box>
          ))}
        </Box>
      </AppContainer>

      <Box
        sx={{
          background: theme.palette.mode === "light" ? "#1F2937" : "#161B22",
          py: { xs: 5, md: 6 },
        }}
      >
        <AppContainer>
          <Grid container spacing={4}>
            {trustStats.map((stat) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      fontSize: { xs: "2rem", md: "2.5rem" },
                      fontWeight: 800,
                      color: "#B8975A",
                      lineHeight: 1.1,
                    }}
                  >
                    {stat.value}
                  </Box>
                  <Box
                    sx={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.65)",
                      fontWeight: 500,
                      marginTop: 0.75,
                    }}
                  >
                    {stat.label}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </AppContainer>
      </Box>

      <AppContainer
        sx={{
          py: { xs: 6, md: 8 },
          "& .swiper-pagination-bullet-active": { background: "#B8975A" },
        }}
      >
        <Heading sx={{ marginBottom: 3 }}>Explore By Neighbourhood</Heading>
        {groupedSlides?.length > 0 ? (
          <Swiper
            slidesPerView={1}
            spaceBetween={30}
            centeredSlides={true}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            pagination={{
              clickable: true,
            }}
            modules={[Autoplay, Pagination]}
            speed={1500}
            effect="fade"
          >
            {groupedSlides.map((group: any) => (
              <SwiperSlide key={group?.location}>
                <Box sx={{ pb: 5 }}>
                  <Heading
                    sx={{
                      color: "text.primary",
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    {group?.location}
                  </Heading>
                  <Grid container spacing={2}>
                    {group?.listings?.map((item: any) => (
                      <Grid item xs={12} sm={6} md={4} key={item?._id}>
                        {renderPropertyCard(item)}
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              background: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "10px",
              color: "text.secondary",
              fontSize: "14px",
            }}
          >
            No neighbourhood listings yet. Check back soon.
          </Box>
        )}
      </AppContainer>

      <Box
        sx={{
          background: "linear-gradient(135deg, #B8975A, #9E7E45)",
          py: { xs: 6, md: 8 },
          textAlign: "center",
        }}
      >
        <AppContainer>
          <Box
            sx={{
              fontSize: { xs: "1.75rem", md: "2.25rem" },
              fontWeight: 800,
              color: "#fff",
              marginBottom: 1.5,
            }}
          >
            Have a Property to Rent?
          </Box>
          <Box
            sx={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "1.1rem",
              marginBottom: 3,
            }}
          >
            List it on Town Ruins and reach thousands of verified tenants
          </Box>
          <AppButton
            variant="outlined"
            size="large"
            onClick={handleListPropertyClick}
            sx={{
              color: "#fff",
              borderColor: "rgba(255,255,255,0.6)",
              "&:hover": {
                borderColor: "#fff",
                background: "rgba(255,255,255,0.1)",
              },
            }}
          >
            List Your Property
          </AppButton>
        </AppContainer>
      </Box>
    </Box>
  );
};

export default Home;
