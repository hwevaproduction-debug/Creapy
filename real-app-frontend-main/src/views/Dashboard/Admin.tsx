import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import AppInput from "../../components/ui/AppInput";
import AppSelect from "../../components/ui/AppSelect";
import MUITable from "../../components/MUITable";
import { Heading } from "../../components/Heading";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import {
  AdminBooking,
  AdminAccommodation,
  AdminAuditLog,
  AdminDispute,
  AdminReport,
  AdminReview,
  BulkReviveFailure,
  ProviderRecord,
  useApproveAccommodationMutation,
  useBulkReviveListingsMutation,
  useCloseDisputeMutation,
  useDismissReportMutation,
  useGetAccommodationsQuery,
  useGetAllBookingsQuery,
  useGetAllReviewsQuery,
  useGetAuditLogsQuery,
  useGetDisputeByIdQuery,
  useGetDisputesQuery,
  useGetModerationQueueQuery,
  useGetReportByIdQuery,
  useGetProvidersQuery,
  useGetReportsQuery,
  useMarkDisputeUnderReviewMutation,
  useLazyGetInactiveListingsQuery,
  useModerateReviewMutation,
  useReinstateAccommodationMutation,
  useReinstateProviderMutation,
  useRejectAccommodationMutation,
  useResolveDisputeMutation,
  useResolveReportMutation,
  useReviewReportMutation,
  useSettleBookingMutation,
  useSuspendAccommodationMutation,
  useSuspendProviderMutation,
  useUpdateCommissionRateMutation,
  useVerifyProviderMutation,
} from "../../redux/api/adminApiSlice";
import { convertToFormattedDate } from "../../utils";

interface ExpiredListingFilters {
  province: string;
  city: string;
  expiredFrom: string;
  expiredTo: string;
  uploadedFrom: string;
  uploadedTo: string;
  landlord: string;
  page: number;
}

interface ProviderFilters {
  verificationStatus: string;
  search: string;
}

interface BookingFilters {
  status: string;
  provider: string;
  dateFrom: string;
  dateTo: string;
  settlementStatus: string;
}

interface ToastState {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning";
}

type AdminTab =
  | "queue"
  | "accommodations"
  | "reviews"
  | "reports"
  | "disputes"
  | "providers"
  | "bookings"
  | "expired"
  | "audit";
type PaginationItem = number | "ellipsis-start" | "ellipsis-end";
type PaginationMeta = {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
};

const MAX_BULK_REVIVE_IDS = 100;

function getBulkReviveLimitMessage() {
  return `You can revive up to ${MAX_BULK_REVIVE_IDS} listings at once. Split your selection into smaller batches.`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const errorWithData = error as {
      data?: { message?: string };
      message?: string;
    };

    if (errorWithData.data?.message) {
      return errorWithData.data.message;
    }

    if (errorWithData.message) {
      return errorWithData.message;
    }
  }

  return fallback;
}

function buildPageArray(totalPages: number, currentPage: number): PaginationItem[] {
  const pages: number[] = [];
  const addPage = (page: number) => {
    if (page >= 1 && page <= totalPages && pages.indexOf(page) === -1) {
      pages.push(page);
    }
  };

  addPage(1);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    addPage(page);
  }

  addPage(totalPages);
  pages.sort((left, right) => left - right);

  const items: PaginationItem[] = [];

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const previousPage = index > 0 ? pages[index - 1] : null;

    if (previousPage !== null && page - previousPage > 1) {
      items.push(previousPage === 1 ? "ellipsis-start" : "ellipsis-end");
    }

    items.push(page);
  }

  return items;
}

function formatStatusLabel(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusChipColor(
  value?: string | null
): "default" | "success" | "warning" | "error" | "info" {
  switch ((value || "").toLowerCase()) {
    case "approved":
    case "active":
    case "confirmed":
    case "settled":
    case "resolved":
      return "success";
    case "pending":
    case "pending_payment":
    case "pending_review":
    case "under_review":
    case "open":
      return "warning";
    case "rejected":
    case "cancelled":
    case "canceled":
    case "expired":
    case "suspended":
    case "dismissed":
    case "closed":
      return "error";
    default:
      return "default";
  }
}

function formatLocation(
  value?: { province?: string; city?: string } | null
) {
  return [value?.province, value?.city].filter(Boolean).join(" / ") || "—";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function firstStringValue(
  record: Record<string, unknown> | null,
  keys: string[]
) {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

const AdminDashboard: React.FC = () => {
  const ROWS_PER_PAGE = 20;

  const [activeTab, setActiveTab] = useState<AdminTab>("queue");
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "success",
  });

  const [expiredFilters, setExpiredFilters] = useState<ExpiredListingFilters>({
    province: "",
    city: "",
    expiredFrom: "",
    expiredTo: "",
    uploadedFrom: "",
    uploadedTo: "",
    landlord: "",
    page: 1,
  });
  const [hasSearchedExpired, setHasSearchedExpired] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const [providerDraftFilters, setProviderDraftFilters] = useState<ProviderFilters>({
    verificationStatus: "",
    search: "",
  });
  const [providerFilters, setProviderFilters] = useState<ProviderFilters>({
    verificationStatus: "",
    search: "",
  });
  const [bookingDraftFilters, setBookingDraftFilters] = useState<BookingFilters>({
    status: "",
    provider: "",
    dateFrom: "",
    dateTo: "",
    settlementStatus: "",
  });
  const [bookingFilters, setBookingFilters] = useState<BookingFilters>({
    status: "",
    provider: "",
    dateFrom: "",
    dateTo: "",
    settlementStatus: "",
  });
  const [commissionDrafts, setCommissionDrafts] = useState<Record<string, string>>({});
  const [activeProviderAction, setActiveProviderAction] = useState<string | null>(null);
  const [activeBookingAction, setActiveBookingAction] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    title: string;
    body: string;
    onConfirm: (() => void) | null;
    commissionRate?: string;
  }>({ open: false, title: "", body: "", onConfirm: null });
  const [textActionDialog, setTextActionDialog] = useState<{
    open: boolean;
    title: string;
    body: string;
    label: string;
    value: string;
    onConfirm: ((value: string) => void) | null;
  }>({
    open: false,
    title: "",
    body: "",
    label: "Reason",
    value: "",
    onConfirm: null,
  });
  const [accommodationFilters, setAccommodationFilters] = useState({
    moderationStatus: "",
    type: "",
    province: "",
    search: "",
    page: 1,
  });
  const [reviewFilters, setReviewFilters] = useState({
    isPublished: "",
    accommodationId: "",
    from: "",
    to: "",
    page: 1,
  });
  const [reportFilters, setReportFilters] = useState({
    status: "",
    targetType: "",
    reason: "",
    page: 1,
  });
  const [disputeFilters, setDisputeFilters] = useState({
    status: "",
    raisedByRole: "",
    page: 1,
  });
  const [auditFilters, setAuditFilters] = useState({
    action: "",
    targetType: "",
    from: "",
    to: "",
    adminSearch: "",
    page: 1,
  });
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);

  const [triggerSearch, { data: inactiveData, isFetching: isFetchingInactive }] =
    useLazyGetInactiveListingsQuery();
  const [bulkRevive, { isLoading: isReviving }] = useBulkReviveListingsMutation();
  const { data: providersData, isFetching: isFetchingProviders } =
    useGetProvidersQuery(providerFilters);
  const { data: providerOptionsData } = useGetProvidersQuery({});
  const [verifyProvider, { isLoading: isVerifyingProvider }] =
    useVerifyProviderMutation();
  const [updateCommissionRate, { isLoading: isSavingCommission }] =
    useUpdateCommissionRateMutation();
  const { data: bookingsData, isFetching: isFetchingBookings } =
    useGetAllBookingsQuery(bookingFilters);
  const [settleBooking, { isLoading: isSettlingBooking }] =
    useSettleBookingMutation();
  const { data: queueData, isFetching: isFetchingQueue } =
    useGetModerationQueueQuery();
  const { data: accommodationsData, isFetching: isFetchingAccommodations } =
    useGetAccommodationsQuery({
      ...accommodationFilters,
      limit: ROWS_PER_PAGE,
    });
  const { data: pendingAccommodationsData, isFetching: isFetchingPendingAccommodations } =
    useGetAccommodationsQuery({
      moderationStatus: "PENDING_REVIEW",
      limit: 10,
    });
  const { data: reviewsData, isFetching: isFetchingReviews } =
    useGetAllReviewsQuery({
      ...reviewFilters,
      limit: ROWS_PER_PAGE,
    });
  const { data: reportsData, isFetching: isFetchingReports } =
    useGetReportsQuery({
      ...reportFilters,
      limit: ROWS_PER_PAGE,
    });
  const { data: selectedReportData, isFetching: isFetchingReportDetail } =
    useGetReportByIdQuery(selectedReportId || "", {
      skip: !selectedReportId,
    });
  const { data: disputesData, isFetching: isFetchingDisputes } =
    useGetDisputesQuery({
      ...disputeFilters,
      limit: ROWS_PER_PAGE,
    });
  const { data: selectedDisputeData, isFetching: isFetchingDisputeDetail } =
    useGetDisputeByIdQuery(selectedDisputeId || "", {
      skip: !selectedDisputeId,
    });
  const { data: auditLogsData, isFetching: isFetchingAuditLogs } =
    useGetAuditLogsQuery({
      ...auditFilters,
      limit: ROWS_PER_PAGE,
    });
  const [approveAccommodation] = useApproveAccommodationMutation();
  const [rejectAccommodation] = useRejectAccommodationMutation();
  const [suspendAccommodation] = useSuspendAccommodationMutation();
  const [reinstateAccommodation] = useReinstateAccommodationMutation();
  const [suspendProvider] = useSuspendProviderMutation();
  const [reinstateProvider] = useReinstateProviderMutation();
  const [moderateReview] = useModerateReviewMutation();
  const [reviewReport] = useReviewReportMutation();
  const [resolveReport] = useResolveReportMutation();
  const [dismissReport] = useDismissReportMutation();
  const [markDisputeUnderReview] = useMarkDisputeUnderReviewMutation();
  const [resolveDispute] = useResolveDisputeMutation();
  const [closeDispute] = useCloseDisputeMutation();

  const listings = inactiveData?.data ?? [];
  const totalListings = inactiveData?.total ?? 0;
  const totalPages = Math.ceil(totalListings / ROWS_PER_PAGE);
  const paginationItems = buildPageArray(totalPages, expiredFilters.page);
  const currentPageIds = listings.map((listing) => listing._id);
  const selectedCount = Object.keys(selectedIds).length;
  const currentPageSelectedCount = currentPageIds.filter(
    (id) => selectedIds[id] === true
  ).length;
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageSelectedCount === currentPageIds.length;
  const someCurrentPageSelected =
    currentPageSelectedCount > 0 && !allCurrentPageSelected;
  const providers = useMemo(
    () => providersData?.data ?? [],
    [providersData?.data]
  );
  const allProviders = providerOptionsData?.data ?? [];
  const bookings = bookingsData?.data ?? [];
  const accommodations = accommodationsData?.data ?? [];
  const pendingAccommodations = pendingAccommodationsData?.data ?? [];
  const reviews = reviewsData?.data?.reviews ?? [];
  const reports = reportsData?.data ?? [];
  const selectedReport = selectedReportData?.report ?? null;
  const disputes = disputesData?.data ?? [];
  const selectedDispute = selectedDisputeData?.dispute ?? null;
  const auditLogs = auditLogsData?.data ?? [];
  const settledBookingsCount = bookings.filter(
    (booking) => booking.settlementStatus === "settled"
  ).length;
  const pendingSettlementCount = bookings.filter(
    (booking) => booking.settlementStatus !== "settled"
  ).length;
  const uniqueBookingProviders = Array.from(
    new Set(bookings.map((booking) => booking.provider?._id).filter(Boolean))
  ).length;

  useEffect(() => {
    if (selectedCount === 0 && showConfirm) {
      setShowConfirm(false);
    }
  }, [selectedCount, showConfirm]);

  useEffect(() => {
    if (!providers.length) {
      return;
    }

    setCommissionDrafts((previous) => {
      const next = { ...previous };

      providers.forEach((provider) => {
        if (next[provider._id] === undefined) {
          next[provider._id] = String(provider.providerProfile?.commissionRate ?? 0);
        }
      });

      return next;
    });
  }, [providers]);

  const handleExpiredFilterChange = (
    field: keyof ExpiredListingFilters,
    value: string | number
  ) => {
    setExpiredFilters((previous) => ({ ...previous, [field]: value }));
  };

  const handleSearchExpired = () => {
    const nextFilters = { ...expiredFilters, page: 1 };
    setHasSearchedExpired(true);
    setExpiredFilters(nextFilters);
    setSelectedIds({});
    setShowConfirm(false);
    triggerSearch({ ...nextFilters, limit: ROWS_PER_PAGE });
  };

  const handleExpiredPageChange = (newPage: number) => {
    const nextFilters = { ...expiredFilters, page: newPage };
    setExpiredFilters(nextFilters);
    triggerSearch({ ...nextFilters, limit: ROWS_PER_PAGE });
  };

  const handleRowCheck = (id: string) => {
    setSelectedIds((previous) => {
      const next = { ...previous };

      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }

      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds((previous) => {
      const next = { ...previous };

      if (allCurrentPageSelected) {
        currentPageIds.forEach((id) => {
          delete next[id];
        });
      } else {
        currentPageIds.forEach((id) => {
          next[id] = true;
        });
      }

      return next;
    });
  };

  const handleReviveClick = () => {
    if (selectedCount > MAX_BULK_REVIVE_IDS) {
      setToast({
        open: true,
        message: getBulkReviveLimitMessage(),
        type: "error",
      });
      setShowConfirm(false);
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmRevive = async () => {
    if (selectedCount === 0) {
      setShowConfirm(false);
      return;
    }

    try {
      const idNameMap: Record<string, string> = {};
      listings.forEach((item) => {
        idNameMap[item._id] = item.name;
      });

      const result = await bulkRevive({ ids: Object.keys(selectedIds) }).unwrap();
      const revivedCount = result.revived.length;
      const failedCount = result.failed.length;

      let message = `${revivedCount} listings revived successfully.`;

      if (failedCount > 0) {
        const failureDetails = result.failed
          .slice(0, 1)
          .map((failure: BulkReviveFailure) => {
            const label =
              idNameMap[failure.id ?? ""] || failure.id || "Unknown listing";
            return `${label} - ${failure.reason || "Unknown error"}`;
          })
          .join(", ");

        message =
          revivedCount > 0
            ? `${revivedCount} revived. ${failedCount} failed: ${failureDetails}`
            : `Revival failed. ${failureDetails}`;
      }

      setToast({
        open: true,
        message,
        type:
          revivedCount > 0 && failedCount === 0
            ? "success"
            : revivedCount > 0
            ? "warning"
            : "error",
      });
      setSelectedIds({});
      setShowConfirm(false);
      triggerSearch({ ...expiredFilters, limit: ROWS_PER_PAGE });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "An error occurred during revival."),
        type: "error",
      });
    }
  };

  const handleVerifyProvider = async (
    providerId: string,
    verificationStatus: "approved" | "rejected"
  ) => {
    setActiveProviderAction(providerId);

    try {
      await verifyProvider({ id: providerId, verificationStatus }).unwrap();
      setToast({
        open: true,
        message: `Provider ${verificationStatus} successfully.`,
        type: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "Unable to update provider verification."),
        type: "error",
      });
    } finally {
      setActiveProviderAction(null);
    }
  };

  const handleSaveCommission = async (provider: ProviderRecord) => {
    const draftValue = commissionDrafts[provider._id];
    const commissionRate = Number(draftValue);

    if (!Number.isFinite(commissionRate) || commissionRate < 0) {
      setToast({
        open: true,
        message: "Commission rate must be a non-negative number.",
        type: "error",
      });
      return;
    }

    setActiveProviderAction(provider._id);

    try {
      await updateCommissionRate({ id: provider._id, commissionRate }).unwrap();
      setToast({
        open: true,
        message: "Commission rate updated successfully.",
        type: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "Unable to save commission rate."),
        type: "error",
      });
    } finally {
      setActiveProviderAction(null);
    }
  };

  const handleSettleBooking = async (booking: AdminBooking) => {
    setActiveBookingAction(booking._id);

    try {
      await settleBooking({ id: booking._id }).unwrap();
      setToast({
        open: true,
        message: "Booking marked as settled.",
        type: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, "Unable to settle booking."),
        type: "error",
      });
    } finally {
      setActiveBookingAction(null);
    }
  };

  const openTextAction = (
    title: string,
    body: string,
    label: string,
    onConfirm: (value: string) => void
  ) => {
    setTextActionDialog({
      open: true,
      title,
      body,
      label,
      value: "",
      onConfirm,
    });
  };

  const closeTextAction = () => {
    setTextActionDialog({
      open: false,
      title: "",
      body: "",
      label: "Reason",
      value: "",
      onConfirm: null,
    });
  };

  const runAdminAction = async (
    action: Promise<unknown>,
    successMessage: string,
    fallbackMessage: string
  ) => {
    try {
      await action;
      setToast({ open: true, message: successMessage, type: "success" });
    } catch (error) {
      setToast({
        open: true,
        message: getErrorMessage(error, fallbackMessage),
        type: "error",
      });
    }
  };

  const handleAccommodationAction = (
    accommodation: AdminAccommodation,
    action: "approve" | "reject" | "suspend" | "reinstate"
  ) => {
    if (action === "approve") {
      runAdminAction(
        approveAccommodation({ id: accommodation._id }).unwrap(),
        "Accommodation approved.",
        "Unable to approve accommodation."
      );
      return;
    }

    if (action === "reinstate") {
      runAdminAction(
        reinstateAccommodation({ id: accommodation._id }).unwrap(),
        "Accommodation reinstated.",
        "Unable to reinstate accommodation."
      );
      return;
    }

    openTextAction(
      action === "reject" ? "Reject Accommodation" : "Suspend Accommodation",
      `${action === "reject" ? "Reject" : "Suspend"} ${accommodation.name}?`,
      "Reason",
      (reason) => {
        const mutation =
          action === "reject" ? rejectAccommodation : suspendAccommodation;

        runAdminAction(
          mutation({ id: accommodation._id, reason }).unwrap(),
          action === "reject"
            ? "Accommodation rejected."
            : "Accommodation suspended.",
          "Unable to update accommodation."
        );
      }
    );
  };

  const handleProviderSuspension = (provider: ProviderRecord, suspend: boolean) => {
    if (suspend) {
      openTextAction(
        "Suspend Provider",
        `Suspend ${provider.username}? New bookings will be blocked.`,
        "Reason",
        (reason) =>
          runAdminAction(
            suspendProvider({ id: provider._id, reason }).unwrap(),
            "Provider suspended.",
            "Unable to suspend provider."
          )
      );
      return;
    }

    runAdminAction(
      reinstateProvider({ id: provider._id }).unwrap(),
      "Provider reinstated.",
      "Unable to reinstate provider."
    );
  };

  const handleReviewModeration = (
    review: AdminReview,
    action: "publish" | "unpublish" | "delete" | "restore"
  ) => {
    runAdminAction(
      moderateReview({ id: review._id, action }).unwrap(),
      "Review updated.",
      "Unable to update review."
    );
  };

  const handleReportAction = (
    report: AdminReport,
    action: "review" | "resolve" | "dismiss"
  ) => {
    if (action === "review") {
      runAdminAction(
        reviewReport({ id: report._id }).unwrap(),
        "Report marked under review.",
        "Unable to update report."
      );
      return;
    }

    openTextAction(
      action === "resolve" ? "Resolve Report" : "Dismiss Report",
      `${action === "resolve" ? "Resolve" : "Dismiss"} this report?`,
      "Resolution",
      (resolution) => {
        const mutation = action === "resolve" ? resolveReport : dismissReport;
        runAdminAction(
          mutation({ id: report._id, resolution }).unwrap(),
          action === "resolve" ? "Report resolved." : "Report dismissed.",
          "Unable to update report."
        );
      }
    );
  };

  const handleDisputeAction = (
    dispute: AdminDispute,
    action: "review" | "resolve" | "close"
  ) => {
    if (action === "review") {
      runAdminAction(
        markDisputeUnderReview({ id: dispute._id }).unwrap(),
        "Dispute marked under review.",
        "Unable to update dispute."
      );
      return;
    }

    if (action === "close") {
      runAdminAction(
        closeDispute({ id: dispute._id }).unwrap(),
        "Dispute closed.",
        "Unable to close dispute."
      );
      return;
    }

    openTextAction(
      "Resolve Dispute",
      "Enter a resolution note before resolving this dispute.",
      "Resolution",
      (resolution) =>
        runAdminAction(
          resolveDispute({ id: dispute._id, resolution }).unwrap(),
          "Dispute resolved.",
          "Unable to resolve dispute."
        )
    );
  };

  const renderEmptyState = (message: string) => (
    <AppCard sx={{ p: "40px", textAlign: "center", color: "#9ca3af" }}>
      {message}
    </AppCard>
  );

  const renderStatusChip = (value?: string | null) => (
    <Chip
      label={formatStatusLabel(value)}
      color={getStatusChipColor(value)}
      size="small"
    />
  );

  const renderPaginationControls = (
    pagination: PaginationMeta | undefined,
    currentPage: number,
    onPageChange: (page: number) => void,
    disabled = false
  ) => {
    const limit = pagination?.limit || ROWS_PER_PAGE;
    const total = pagination?.total || 0;
    const page = pagination?.page || currentPage;
    const pages = Math.ceil(total / limit);

    if (pages <= 1) {
      return null;
    }

    return (
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
        <AppButton
          size="small"
          variant="outlined"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </AppButton>
        {buildPageArray(pages, page).map((item) =>
          typeof item !== "number" ? (
            <Typography
              key={item}
              variant="body2"
              sx={{ display: "flex", alignItems: "center", px: 0.5, color: "#9ca3af" }}
            >
              ...
            </Typography>
          ) : (
            <AppButton
              key={item}
              size="small"
              variant={page === item ? "contained" : "outlined"}
              disabled={disabled}
              onClick={() => onPageChange(item)}
            >
              {item}
            </AppButton>
          )
        )}
        <AppButton
          size="small"
          variant="outlined"
          disabled={disabled || page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </AppButton>
      </Box>
    );
  };

  const renderAccommodationActions = (accommodation: AdminAccommodation) => {
    const status = String(accommodation.moderationStatus || "").toUpperCase();

    return (
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {status !== "APPROVED" && (
          <AppButton
            size="small"
            onClick={() => handleAccommodationAction(accommodation, "approve")}
          >
            Approve
          </AppButton>
        )}
        {status !== "REJECTED" && (
          <AppButton
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handleAccommodationAction(accommodation, "reject")}
          >
            Reject
          </AppButton>
        )}
        {status !== "SUSPENDED" && (
          <AppButton
            size="small"
            variant="outlined"
            color="warning"
            onClick={() => handleAccommodationAction(accommodation, "suspend")}
          >
            Suspend
          </AppButton>
        )}
        {status === "SUSPENDED" && (
          <AppButton
            size="small"
            onClick={() => handleAccommodationAction(accommodation, "reinstate")}
          >
            Reinstate
          </AppButton>
        )}
      </Box>
    );
  };

  const renderModerationQueue = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Moderation Queue</Heading>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 2,
          mb: 2,
        }}
      >
        {[
          ["Pending Accommodations", queueData?.pendingAccommodations ?? 0],
          ["Open Reports", queueData?.openReports ?? 0],
          ["Open Disputes", queueData?.openDisputes ?? 0],
          ["Pending Reviews", queueData?.pendingReviews ?? 0],
        ].map(([label, value]) => (
          <AppCard key={label} sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: "#6b7280", mb: 0.5 }}>
              {label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {isFetchingQueue ? "..." : value}
            </Typography>
          </AppCard>
        ))}
      </Box>

      <Heading sx={{ mb: "14px", fontSize: "18px" }}>Pending Accommodations</Heading>
      {isFetchingPendingAccommodations ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : pendingAccommodations.length === 0 ? (
        renderEmptyState("No accommodations are pending review.")
      ) : (
        <MUITable tableHead={["Name", "Owner", "Location", "Submitted", "Status", "Actions"]}>
          {pendingAccommodations.map((accommodation) => (
            <TableRow key={accommodation._id}>
              <TableCell sx={{ fontWeight: 600 }}>{accommodation.name}</TableCell>
              <TableCell>
                <Box>{accommodation.owner?.username || "Unknown owner"}</Box>
                <Box sx={{ fontSize: "12px", color: "#6b7280" }}>
                  {accommodation.owner?.email || ""}
                </Box>
              </TableCell>
              <TableCell>{formatLocation(accommodation)}</TableCell>
              <TableCell>
                {accommodation.createdAt
                  ? convertToFormattedDate(accommodation.createdAt)
                  : "—"}
              </TableCell>
              <TableCell>{renderStatusChip(accommodation.moderationStatus)}</TableCell>
              <TableCell>{renderAccommodationActions(accommodation)}</TableCell>
            </TableRow>
          ))}
        </MUITable>
      )}
    </>
  );

  const renderAccommodations = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Accommodations</Heading>
      <Paper sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", boxShadow: "none" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ minWidth: 180 }}>
            <AppSelect
              size="small"
              value={accommodationFilters.moderationStatus}
              onChange={(event) =>
                setAccommodationFilters((previous) => ({
                  ...previous,
                  moderationStatus: String(event.target.value),
                  page: 1,
                }))
              }
              options={[
                { label: "All Statuses", value: "" },
                { label: "Pending Review", value: "PENDING_REVIEW" },
                { label: "Approved", value: "APPROVED" },
                { label: "Rejected", value: "REJECTED" },
                { label: "Suspended", value: "SUSPENDED" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: 180 }}>
            <AppSelect
              size="small"
              value={accommodationFilters.type}
              onChange={(event) =>
                setAccommodationFilters((previous) => ({
                  ...previous,
                  type: String(event.target.value),
                  page: 1,
                }))
              }
              options={[
                { label: "All Types", value: "" },
                { label: "Hotel", value: "HOTEL" },
                { label: "Lodge", value: "LODGE" },
                { label: "BNB", value: "BNB" },
                { label: "Apartment", value: "APARTMENT" },
                { label: "Guest House", value: "GUEST_HOUSE" },
                { label: "Hostel", value: "HOSTEL" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: 180 }}>
            <AppInput
              size="small"
              placeholder="Province"
              value={accommodationFilters.province}
              onChange={(event) =>
                setAccommodationFilters((previous) => ({
                  ...previous,
                  province: event.target.value,
                  page: 1,
                }))
              }
            />
          </Box>
          <Box sx={{ minWidth: 240 }}>
            <AppInput
              size="small"
              placeholder="Search name or owner"
              value={accommodationFilters.search}
              onChange={(event) =>
                setAccommodationFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                  page: 1,
                }))
              }
            />
          </Box>
        </Box>
      </Paper>

      {isFetchingAccommodations ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : accommodations.length === 0 ? (
        renderEmptyState("No accommodations match the current filters.")
      ) : (
        <MUITable tableHead={["Name", "Type", "Owner", "Location", "Status", "Published", "Actions"]}>
          {accommodations.map((accommodation) => (
            <TableRow key={accommodation._id}>
              <TableCell sx={{ fontWeight: 600 }}>{accommodation.name}</TableCell>
              <TableCell>{formatStatusLabel(accommodation.type)}</TableCell>
              <TableCell>
                <Box>{accommodation.owner?.username || "Unknown owner"}</Box>
                <Box sx={{ fontSize: "12px", color: "#6b7280" }}>
                  {accommodation.owner?.email || ""}
                </Box>
              </TableCell>
              <TableCell>{formatLocation(accommodation)}</TableCell>
              <TableCell>{renderStatusChip(accommodation.moderationStatus)}</TableCell>
              <TableCell>{accommodation.isPublished ? "Yes" : "No"}</TableCell>
              <TableCell>{renderAccommodationActions(accommodation)}</TableCell>
            </TableRow>
          ))}
        </MUITable>
      )}
      {renderPaginationControls(
        accommodationsData?.pagination,
        accommodationFilters.page,
        (page) => setAccommodationFilters((previous) => ({ ...previous, page })),
        isFetchingAccommodations
      )}
    </>
  );

  const renderReviewModeration = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Review Moderation</Heading>
      <Paper sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", boxShadow: "none" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ minWidth: 180 }}>
            <AppSelect
              size="small"
              value={reviewFilters.isPublished}
              onChange={(event) =>
                setReviewFilters((previous) => ({
                  ...previous,
                  isPublished: String(event.target.value),
                  page: 1,
                }))
              }
              options={[
                { label: "All", value: "" },
                { label: "Published", value: "true" },
                { label: "Unpublished", value: "false" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: 220 }}>
            <AppInput
              size="small"
              placeholder="Accommodation ID"
              value={reviewFilters.accommodationId}
              onChange={(event) =>
                setReviewFilters((previous) => ({
                  ...previous,
                  accommodationId: event.target.value,
                  page: 1,
                }))
              }
            />
          </Box>
          <Box sx={{ minWidth: 170 }}>
            <AppInput
              size="small"
              type="date"
              value={reviewFilters.from}
              onChange={(event) =>
                setReviewFilters((previous) => ({ ...previous, from: event.target.value, page: 1 }))
              }
            />
          </Box>
          <Box sx={{ minWidth: 170 }}>
            <AppInput
              size="small"
              type="date"
              value={reviewFilters.to}
              onChange={(event) =>
                setReviewFilters((previous) => ({ ...previous, to: event.target.value, page: 1 }))
              }
            />
          </Box>
        </Box>
      </Paper>

      {isFetchingReviews ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : reviews.length === 0 ? (
        renderEmptyState("No reviews match the current filters.")
      ) : (
        <MUITable tableHead={["Guest", "Accommodation", "Rating", "Comment", "Status", "Actions"]}>
          {reviews.map((review) => (
            <TableRow key={review._id}>
              <TableCell>{review.guest?.username || "Guest"}</TableCell>
              <TableCell>{review.accommodation?.name || "Accommodation"}</TableCell>
              <TableCell>{review.overallRating ?? "—"}</TableCell>
              <TableCell sx={{ maxWidth: 260 }}>{review.comment || "—"}</TableCell>
              <TableCell>
                {renderStatusChip(review.deletedAt ? "deleted" : review.isPublished ? "published" : "unpublished")}
              </TableCell>
              <TableCell>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {!review.isPublished && (
                    <AppButton size="small" onClick={() => handleReviewModeration(review, "publish")}>
                      Publish
                    </AppButton>
                  )}
                  {review.isPublished && (
                    <AppButton
                      size="small"
                      variant="outlined"
                      onClick={() => handleReviewModeration(review, "unpublish")}
                    >
                      Unpublish
                    </AppButton>
                  )}
                  {!review.deletedAt ? (
                    <AppButton
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleReviewModeration(review, "delete")}
                    >
                      Delete
                    </AppButton>
                  ) : (
                    <AppButton size="small" onClick={() => handleReviewModeration(review, "restore")}>
                      Restore
                    </AppButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </MUITable>
      )}
      {renderPaginationControls(
        reviewsData?.pagination,
        reviewFilters.page,
        (page) => setReviewFilters((previous) => ({ ...previous, page })),
        isFetchingReviews
      )}
    </>
  );

  const renderReportDetail = () => {
    if (!selectedReportId) {
      return null;
    }

    const target = asRecord(selectedReport?.target);
    const targetOwner =
      asRecord(target?.owner) ||
      asRecord(target?.user) ||
      asRecord(target?.guest);
    const targetLabel =
      firstStringValue(target, ["name", "title", "email", "username", "_id", "id"]) ||
      selectedReport?.targetId ||
      "—";
    const targetOwnerLabel =
      firstStringValue(targetOwner, ["email", "username", "_id", "id"]) || "—";

    return (
      <AppCard sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Report Detail
        </Typography>
        {isFetchingReportDetail ? (
          <Box sx={{ display: "flex", py: 2 }}>
            <CircularProgress size={22} />
          </Box>
        ) : selectedReport ? (
          <>
            <Typography variant="body2">
              Target: {selectedReport.targetType} {selectedReport.targetId}
            </Typography>
            <Typography variant="body2">Target Context: {targetLabel}</Typography>
            <Typography variant="body2">Target Owner/User: {targetOwnerLabel}</Typography>
            <Typography variant="body2">
              Reporter: {selectedReport.reporter?.email || selectedReport.reporter?.username || "—"}
            </Typography>
            <Typography variant="body2">Reason: {formatStatusLabel(selectedReport.reason)}</Typography>
            <Typography variant="body2">Status: {formatStatusLabel(selectedReport.status)}</Typography>
            <Typography variant="body2">Description: {selectedReport.description || "—"}</Typography>
            <Typography variant="body2">Resolution: {selectedReport.resolution || "—"}</Typography>
          </>
        ) : (
          <Typography variant="body2">Report detail unavailable.</Typography>
        )}
      </AppCard>
    );
  };

  const renderDisputeDetail = () => {
    if (!selectedDisputeId) {
      return null;
    }

    const booking = selectedDispute?.booking;
    const bookingWindow =
      booking?.checkIn || booking?.checkOut
        ? `${booking?.checkIn ? convertToFormattedDate(booking.checkIn) : "—"} to ${
            booking?.checkOut ? convertToFormattedDate(booking.checkOut) : "—"
          }`
        : "—";

    return (
      <AppCard sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Dispute Detail
        </Typography>
        {isFetchingDisputeDetail ? (
          <Box sx={{ display: "flex", py: 2 }}>
            <CircularProgress size={22} />
          </Box>
        ) : selectedDispute ? (
          <>
            <Typography variant="body2">Booking: {selectedDispute.bookingId}</Typography>
            <Typography variant="body2">Booking Status: {formatStatusLabel(booking?.status)}</Typography>
            <Typography variant="body2">Stay: {bookingWindow}</Typography>
            <Typography variant="body2">Room: {booking?.room?.name || "—"}</Typography>
            <Typography variant="body2">
              Accommodation: {booking?.room?.accommodation?.name || "—"}
            </Typography>
            <Typography variant="body2">
              Guest: {booking?.guest?.email || booking?.guest?.username || "—"}
            </Typography>
            <Typography variant="body2">
              Provider: {booking?.provider?.email || booking?.provider?.username || "—"}
            </Typography>
            <Typography variant="body2">
              Raised By: {selectedDispute.raiser?.email || selectedDispute.raiser?.username || "—"}
            </Typography>
            <Typography variant="body2">Reason: {formatStatusLabel(selectedDispute.reason)}</Typography>
            <Typography variant="body2">Status: {formatStatusLabel(selectedDispute.status)}</Typography>
            <Typography variant="body2">Description: {selectedDispute.description || "—"}</Typography>
            <Typography variant="body2">Resolution: {selectedDispute.resolution || "—"}</Typography>
          </>
        ) : (
          <Typography variant="body2">Dispute detail unavailable.</Typography>
        )}
      </AppCard>
    );
  };

  const renderReports = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Reports</Heading>
      <Paper sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", boxShadow: "none" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ minWidth: 180 }}>
            <AppSelect
              size="small"
              value={reportFilters.status}
              onChange={(event) =>
                setReportFilters((previous) => ({
                  ...previous,
                  status: String(event.target.value),
                  page: 1,
                }))
              }
              options={[
                { label: "All Statuses", value: "" },
                { label: "Open", value: "OPEN" },
                { label: "Under Review", value: "UNDER_REVIEW" },
                { label: "Resolved", value: "RESOLVED" },
                { label: "Dismissed", value: "DISMISSED" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: 180 }}>
            <AppSelect
              size="small"
              value={reportFilters.targetType}
              onChange={(event) =>
                setReportFilters((previous) => ({
                  ...previous,
                  targetType: String(event.target.value),
                  page: 1,
                }))
              }
              options={[
                { label: "All Targets", value: "" },
                { label: "Listing", value: "Listing" },
                { label: "Accommodation", value: "Accommodation" },
                { label: "Review", value: "Review" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: 180 }}>
            <AppSelect
              size="small"
              value={reportFilters.reason}
              onChange={(event) =>
                setReportFilters((previous) => ({
                  ...previous,
                  reason: String(event.target.value),
                  page: 1,
                }))
              }
              options={[
                { label: "All Reasons", value: "" },
                { label: "Spam", value: "spam" },
                { label: "Inappropriate", value: "inappropriate" },
                { label: "Fraud", value: "fraud" },
                { label: "Other", value: "other" },
              ]}
            />
          </Box>
        </Box>
      </Paper>

      {isFetchingReports ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : reports.length === 0 ? (
        renderEmptyState("No reports match the current filters.")
      ) : (
        <MUITable tableHead={["Reporter", "Target", "Reason", "Status", "Created", "Actions"]}>
          {reports.map((report) => (
            <TableRow
              key={report._id}
              hover
              onClick={() => setSelectedReportId(report._id)}
              sx={{ cursor: "pointer" }}
            >
              <TableCell>{report.reporter?.email || report.reporter?.username || "Reporter"}</TableCell>
              <TableCell>
                <Box>{report.targetType}</Box>
                <Box sx={{ fontSize: "12px", color: "#6b7280" }}>{report.targetId}</Box>
              </TableCell>
              <TableCell>{formatStatusLabel(report.reason)}</TableCell>
              <TableCell>{renderStatusChip(report.status)}</TableCell>
              <TableCell>{report.createdAt ? convertToFormattedDate(report.createdAt) : "—"}</TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {report.status === "OPEN" && (
                    <AppButton size="small" onClick={() => handleReportAction(report, "review")}>
                      Review
                    </AppButton>
                  )}
                  <AppButton size="small" onClick={() => handleReportAction(report, "resolve")}>
                    Resolve
                  </AppButton>
                  <AppButton
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleReportAction(report, "dismiss")}
                  >
                    Dismiss
                  </AppButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </MUITable>
      )}
      {renderPaginationControls(
        reportsData?.pagination,
        reportFilters.page,
        (page) => setReportFilters((previous) => ({ ...previous, page })),
        isFetchingReports
      )}

      {renderReportDetail()}
    </>
  );

  const renderDisputes = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Disputes</Heading>
      <Paper sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", boxShadow: "none" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ minWidth: 180 }}>
            <AppSelect
              size="small"
              value={disputeFilters.status}
              onChange={(event) =>
                setDisputeFilters((previous) => ({
                  ...previous,
                  status: String(event.target.value),
                  page: 1,
                }))
              }
              options={[
                { label: "All Statuses", value: "" },
                { label: "Open", value: "OPEN" },
                { label: "Under Review", value: "UNDER_REVIEW" },
                { label: "Resolved", value: "RESOLVED" },
                { label: "Closed", value: "CLOSED" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: 180 }}>
            <AppSelect
              size="small"
              value={disputeFilters.raisedByRole}
              onChange={(event) =>
                setDisputeFilters((previous) => ({
                  ...previous,
                  raisedByRole: String(event.target.value),
                  page: 1,
                }))
              }
              options={[
                { label: "All Roles", value: "" },
                { label: "Guest", value: "guest" },
                { label: "Provider", value: "provider" },
              ]}
            />
          </Box>
        </Box>
      </Paper>

      {isFetchingDisputes ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : disputes.length === 0 ? (
        renderEmptyState("No disputes match the current filters.")
      ) : (
        <MUITable tableHead={["Booking", "Raised By", "Role", "Reason", "Status", "Created", "Actions"]}>
          {disputes.map((dispute) => (
            <TableRow
              key={dispute._id}
              hover
              onClick={() => setSelectedDisputeId(dispute._id)}
              sx={{ cursor: "pointer" }}
            >
              <TableCell>{dispute.booking?.room?.name || dispute.bookingId}</TableCell>
              <TableCell>{dispute.raiser?.email || dispute.raiser?.username || "User"}</TableCell>
              <TableCell>{formatStatusLabel(dispute.raisedByRole)}</TableCell>
              <TableCell>{formatStatusLabel(dispute.reason)}</TableCell>
              <TableCell>{renderStatusChip(dispute.status)}</TableCell>
              <TableCell>{dispute.createdAt ? convertToFormattedDate(dispute.createdAt) : "—"}</TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {dispute.status === "OPEN" && (
                    <AppButton size="small" onClick={() => handleDisputeAction(dispute, "review")}>
                      Review
                    </AppButton>
                  )}
                  <AppButton size="small" onClick={() => handleDisputeAction(dispute, "resolve")}>
                    Resolve
                  </AppButton>
                  <AppButton
                    size="small"
                    variant="outlined"
                    onClick={() => handleDisputeAction(dispute, "close")}
                  >
                    Close
                  </AppButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </MUITable>
      )}
      {renderPaginationControls(
        disputesData?.pagination,
        disputeFilters.page,
        (page) => setDisputeFilters((previous) => ({ ...previous, page })),
        isFetchingDisputes
      )}

      {renderDisputeDetail()}
    </>
  );

  const renderAuditLog = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Audit Log</Heading>
      <Paper sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", boxShadow: "none" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ minWidth: 220 }}>
            <AppInput
              size="small"
              placeholder="Action"
              value={auditFilters.action}
              onChange={(event) =>
                setAuditFilters((previous) => ({
                  ...previous,
                  action: event.target.value,
                  page: 1,
                }))
              }
            />
          </Box>
          <Box sx={{ minWidth: 180 }}>
            <AppSelect
              size="small"
              value={auditFilters.targetType}
              onChange={(event) =>
                setAuditFilters((previous) => ({
                  ...previous,
                  targetType: String(event.target.value),
                  page: 1,
                }))
              }
              options={[
                { label: "All Targets", value: "" },
                { label: "Accommodation", value: "Accommodation" },
                { label: "User", value: "User" },
                { label: "Review", value: "Review" },
                { label: "Dispute", value: "Dispute" },
                { label: "Report", value: "Report" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: 170 }}>
            <AppInput
              size="small"
              type="date"
              value={auditFilters.from}
              onChange={(event) =>
                setAuditFilters((previous) => ({ ...previous, from: event.target.value, page: 1 }))
              }
            />
          </Box>
          <Box sx={{ minWidth: 170 }}>
            <AppInput
              size="small"
              type="date"
              value={auditFilters.to}
              onChange={(event) =>
                setAuditFilters((previous) => ({ ...previous, to: event.target.value, page: 1 }))
              }
            />
          </Box>
          <Box sx={{ minWidth: 220 }}>
            <AppInput
              size="small"
              placeholder="Admin email or ID"
              value={auditFilters.adminSearch}
              onChange={(event) =>
                setAuditFilters((previous) => ({
                  ...previous,
                  adminSearch: event.target.value,
                  page: 1,
                }))
              }
            />
          </Box>
        </Box>
      </Paper>

      {isFetchingAuditLogs ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : auditLogs.length === 0 ? (
        renderEmptyState("No audit log entries match the current filters.")
      ) : (
        <MUITable tableHead={["Timestamp", "Admin", "Action", "Target", "Target ID", "Notes"]}>
          {auditLogs.map((entry: AdminAuditLog) => (
            <TableRow key={entry._id}>
              <TableCell>{entry.createdAt ? convertToFormattedDate(entry.createdAt) : "—"}</TableCell>
              <TableCell>{entry.admin?.email || entry.admin?.username || "—"}</TableCell>
              <TableCell>
                <Box component="span" sx={{ fontFamily: "monospace", fontSize: "12px" }}>
                  {entry.action}
                </Box>
              </TableCell>
              <TableCell>{entry.targetType}</TableCell>
              <TableCell>
                <Box component="span" sx={{ fontFamily: "monospace", fontSize: "12px" }}>
                  {entry.targetId}
                </Box>
              </TableCell>
              <TableCell sx={{ maxWidth: 260 }}>
                {entry.metadata
                  ? String(
                      (entry.metadata.reason as string | undefined) ||
                        (entry.metadata.resolution as string | undefined) ||
                        ""
                    )
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </MUITable>
      )}
      {renderPaginationControls(
        auditLogsData?.pagination,
        auditFilters.page,
        (page) => setAuditFilters((previous) => ({ ...previous, page })),
        isFetchingAuditLogs
      )}
    </>
  );

  const renderExpiredListings = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Admin - Expired Listings</Heading>

      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          boxShadow: "none",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
          <Box sx={{ minWidth: { xs: "100%", sm: 160 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Province
            </Typography>
            <AppInput
              value={expiredFilters.province}
              onChange={(event) =>
                handleExpiredFilterChange("province", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 160 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              City
            </Typography>
            <AppInput
              value={expiredFilters.city}
              onChange={(event) =>
                handleExpiredFilterChange("city", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Expired From
            </Typography>
            <AppInput
              type="date"
              value={expiredFilters.expiredFrom}
              onChange={(event) =>
                handleExpiredFilterChange("expiredFrom", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Expired To
            </Typography>
            <AppInput
              type="date"
              value={expiredFilters.expiredTo}
              onChange={(event) =>
                handleExpiredFilterChange("expiredTo", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Uploaded From
            </Typography>
            <AppInput
              type="date"
              value={expiredFilters.uploadedFrom}
              onChange={(event) =>
                handleExpiredFilterChange("uploadedFrom", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Uploaded To
            </Typography>
            <AppInput
              type="date"
              value={expiredFilters.uploadedTo}
              onChange={(event) =>
                handleExpiredFilterChange("uploadedTo", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 200 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Landlord
            </Typography>
            <AppInput
              value={expiredFilters.landlord}
              onChange={(event) =>
                handleExpiredFilterChange("landlord", event.target.value)
              }
              disabled={isReviving}
              size="small"
            />
          </Box>
          <AppButton onClick={handleSearchExpired} disabled={isReviving}>
            Search
          </AppButton>
        </Box>
      </Paper>

      {hasSearchedExpired && (
        <>
          {showConfirm && (
            <Box
              sx={{
                background: "#fef9c3",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                p: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 1.5,
                fontSize: "13px",
                color: "#92400e",
              }}
            >
              <Typography variant="body2" sx={{ flex: 1, color: "#92400e" }}>
                Revive {selectedCount} listing{selectedCount !== 1 ? "s" : ""}? Each
                landlord will receive a 48-hour payment window and an email
                notification.
              </Typography>
              <AppButton
                size="small"
                onClick={handleConfirmRevive}
                disabled={selectedCount === 0 || isReviving}
              >
                {isReviving ? <CircularProgress size={16} color="inherit" /> : "Confirm"}
              </AppButton>
              <AppButton
                size="small"
                variant="outlined"
                onClick={() => setShowConfirm(false)}
                disabled={isReviving}
              >
                Cancel
              </AppButton>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1.5,
            }}
          >
            <Typography variant="body2" sx={{ color: "#374151", fontWeight: 500 }}>
              {selectedCount > 0
                ? `${selectedCount} listing${selectedCount !== 1 ? "s" : ""} selected`
                : ""}
            </Typography>
            <AppButton
              onClick={handleReviveClick}
              disabled={selectedCount === 0 || isReviving}
            >
              Revive Selected
            </AppButton>
          </Box>
        </>
      )}

      {!hasSearchedExpired ? (
        renderEmptyState("Use the filters above to find expired listings.")
      ) : isFetchingInactive ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : listings.length === 0 ? (
        renderEmptyState("No expired listings match your filters.")
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
            overflowX: "auto",
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ background: "#f8fafc" }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allCurrentPageSelected}
                    indeterminate={someCurrentPageSelected}
                    onChange={handleSelectAll}
                    disabled={isReviving}
                  />
                </TableCell>
                {["Listing", "Landlord", "Location", "Date Uploaded", "Date Expired"].map(
                  (header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      {header}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {listings.map((item) => (
                <TableRow key={item._id} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds[item._id] === true}
                      onChange={() => handleRowCheck(item._id)}
                      disabled={isReviving}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                  <TableCell>
                    <Box>{item.user?.username ?? "—"}</Box>
                    <Box sx={{ fontSize: "11px", color: "#9ca3af" }}>
                      {item.user?.email ?? ""}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: "#6b7280", fontSize: "14px" }}>
                    {formatLocation(item.location)}
                  </TableCell>
                  <TableCell sx={{ color: "#6b7280", fontSize: "14px" }}>
                    {item.createdAt ? convertToFormattedDate(item.createdAt) : "—"}
                  </TableCell>
                  <TableCell sx={{ color: "#6b7280", fontSize: "14px" }}>
                    {item.paymentDeadline
                      ? convertToFormattedDate(item.paymentDeadline)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {hasSearchedExpired && !isFetchingInactive && totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.5 }}>
          {paginationItems.map((item) =>
            typeof item !== "number" ? (
              <Typography
                key={item}
                variant="body2"
                sx={{ display: "flex", alignItems: "center", px: 0.5, color: "#9ca3af" }}
              >
                ...
              </Typography>
            ) : (
              <AppButton
                key={item}
                size="small"
                variant={expiredFilters.page === item ? "contained" : "outlined"}
                onClick={() => handleExpiredPageChange(item)}
                disabled={isReviving}
              >
                {item}
              </AppButton>
            )
          )}
        </Box>
      )}
    </>
  );

  const renderProviders = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Admin - Providers</Heading>

      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          boxShadow: "none",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
          <Box sx={{ minWidth: { xs: "100%", sm: 220 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Verification Status
            </Typography>
            <AppSelect
              value={providerDraftFilters.verificationStatus}
              onChange={(event) =>
                setProviderDraftFilters((previous) => ({
                  ...previous,
                  verificationStatus: String(event.target.value),
                }))
              }
              size="small"
              options={[
                { label: "All", value: "" },
                { label: "Pending", value: "pending" },
                { label: "Approved", value: "approved" },
                { label: "Rejected", value: "rejected" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 280 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Search Provider
            </Typography>
            <AppInput
              value={providerDraftFilters.search}
              onChange={(event) =>
                setProviderDraftFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }))
              }
              size="small"
              placeholder="Name, email, or phone"
            />
          </Box>
          <AppButton onClick={() => setProviderFilters(providerDraftFilters)}>
            Search
          </AppButton>
        </Box>
      </Paper>

      {isFetchingProviders ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : providers.length === 0 ? (
        renderEmptyState("No providers match the current filters.")
      ) : (
        <MUITable
          tableHead={[
            "Provider",
            "Contact",
            "Rooms",
            "Verification",
            "Commission",
            "Joined",
            "Actions",
          ]}
        >
          {providers.map((provider) => {
            const verificationStatus =
              provider.providerProfile?.verificationStatus || "pending";
            const isPending = verificationStatus === "pending";
            const isApproved = verificationStatus === "approved";
            const isBusy =
              activeProviderAction === provider._id &&
              (isVerifyingProvider || isSavingCommission);

            return (
              <TableRow key={provider._id}>
                <TableCell sx={{ fontWeight: 600 }}>{provider.username}</TableCell>
                <TableCell>
                  <Box>{provider.email || "—"}</Box>
                  <Box sx={{ fontSize: "12px", color: "#6b7280" }}>
                    {provider.phoneNumber || "No phone number"}
                  </Box>
                </TableCell>
                <TableCell>{provider.roomCount ?? 0}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      label={formatStatusLabel(verificationStatus)}
                      color={getStatusChipColor(verificationStatus)}
                      size="small"
                    />
                    {provider.providerProfile?.suspendedAt && (
                      <Chip label="Suspended" color="error" size="small" />
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ minWidth: 170 }}>
                  {isApproved ? (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <AppInput
                        size="small"
                        type="number"
                        value={commissionDrafts[provider._id] ?? ""}
                        onChange={(event) =>
                          setCommissionDrafts((previous) => ({
                            ...previous,
                            [provider._id]: event.target.value,
                          }))
                        }
                        inputProps={{ min: 0, step: "0.01" }}
                      />
                      <AppButton
                        size="small"
                        onClick={() =>
                          setActionDialog({
                            open: true,
                            title: "Update Commission",
                            body: `Update commission rate to ${commissionDrafts[provider._id]}%? This will apply to all future bookings for this provider.`,
                            onConfirm: () => handleSaveCommission(provider),
                            commissionRate: commissionDrafts[provider._id],
                          })
                        }
                        disabled={isBusy}
                      >
                        Save
                      </AppButton>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#6b7280" }}>
                      {provider.providerProfile?.commissionRate ?? 0}%
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {provider.createdAt ? convertToFormattedDate(provider.createdAt) : "—"}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {isPending && (
                      <>
                        <AppButton
                          size="small"
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              title: "Approve Provider",
                              body: "Approve this provider? They will gain access to create rooms and accept bookings.",
                              onConfirm: () =>
                                handleVerifyProvider(provider._id, "approved"),
                            })
                          }
                          disabled={isBusy}
                        >
                          Approve
                        </AppButton>
                        <AppButton
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              title: "Reject Provider",
                              body: "Reject this provider? They will be notified.",
                              onConfirm: () =>
                                handleVerifyProvider(provider._id, "rejected"),
                            })
                          }
                          disabled={isBusy}
                        >
                          Reject
                        </AppButton>
                      </>
                    )}
                    {provider.providerProfile?.suspendedAt ? (
                      <AppButton
                        size="small"
                        onClick={() => handleProviderSuspension(provider, false)}
                        disabled={isBusy}
                      >
                        Reinstate
                      </AppButton>
                    ) : (
                      <AppButton
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleProviderSuspension(provider, true)}
                        disabled={isBusy}
                      >
                        Suspend
                      </AppButton>
                    )}
                    {!isPending && !isApproved && (
                      <Typography variant="body2" sx={{ color: "#6b7280" }}>
                        Review completed
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </MUITable>
      )}
    </>
  );

  const renderBookings = () => (
    <>
      <Heading sx={{ mb: "20px" }}>Admin - Bookings & Settlements</Heading>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 2,
        }}
      >
        <AppCard sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 0.5 }}>
            Total Bookings
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {bookings.length}
          </Typography>
        </AppCard>
        <AppCard sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 0.5 }}>
            Pending Settlement
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {pendingSettlementCount}
          </Typography>
        </AppCard>
        <AppCard sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 0.5 }}>
            Settled
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {settledBookingsCount}
          </Typography>
        </AppCard>
        <AppCard sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 0.5 }}>
            Providers in View
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {uniqueBookingProviders}
          </Typography>
        </AppCard>
      </Box>

      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          boxShadow: "none",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
          <Box sx={{ minWidth: { xs: "100%", sm: 200 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Booking Status
            </Typography>
            <AppSelect
              value={bookingDraftFilters.status}
              onChange={(event) =>
                setBookingDraftFilters((previous) => ({
                  ...previous,
                  status: String(event.target.value),
                }))
              }
              size="small"
              options={[
                { label: "All", value: "" },
                { label: "Confirmed", value: "confirmed" },
                { label: "Pending", value: "pending" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" },
              ]}
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 220 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Provider
            </Typography>
            <AppSelect
              value={bookingDraftFilters.provider}
              onChange={(event) =>
                setBookingDraftFilters((previous) => ({
                  ...previous,
                  provider: String(event.target.value),
                }))
              }
              size="small"
              options={[
                { label: "All", value: "" },
                ...allProviders.map((provider) => ({
                  label: provider.username,
                  value: provider._id,
                })),
              ]}
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Date From
            </Typography>
            <AppInput
              type="date"
              size="small"
              value={bookingDraftFilters.dateFrom}
              onChange={(event) =>
                setBookingDraftFilters((previous) => ({
                  ...previous,
                  dateFrom: event.target.value,
                }))
              }
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 180 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Date To
            </Typography>
            <AppInput
              type="date"
              size="small"
              value={bookingDraftFilters.dateTo}
              onChange={(event) =>
                setBookingDraftFilters((previous) => ({
                  ...previous,
                  dateTo: event.target.value,
                }))
              }
            />
          </Box>
          <Box sx={{ minWidth: { xs: "100%", sm: 220 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Settlement Status
            </Typography>
            <AppSelect
              value={bookingDraftFilters.settlementStatus}
              onChange={(event) =>
                setBookingDraftFilters((previous) => ({
                  ...previous,
                  settlementStatus: String(event.target.value),
                }))
              }
              size="small"
              options={[
                { label: "All", value: "" },
                { label: "Pending", value: "pending" },
                { label: "Settled", value: "settled" },
              ]}
            />
          </Box>
          <AppButton onClick={() => setBookingFilters(bookingDraftFilters)}>
            Search
          </AppButton>
        </Box>
      </Paper>

      {isFetchingBookings ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : bookings.length === 0 ? (
        renderEmptyState("No bookings match the current filters.")
      ) : (
        <MUITable
          tableHead={[
            "Booking",
            "Provider",
            "Stay Dates",
            "Booked On",
            "Status",
            "Settlement",
            "Action",
          ]}
        >
          {bookings.map((booking) => {
            const canSettle =
              booking.settlementStatus !== "settled" &&
              !["cancelled", "canceled", "rejected", "expired"].includes(
                String(booking.status || "").toLowerCase()
              );

            return (
              <TableRow key={booking._id}>
                <TableCell>
                  <Box sx={{ fontWeight: 600 }}>{booking.room?.name || "Room booking"}</Box>
                  <Box sx={{ fontSize: "12px", color: "#6b7280" }}>
                    {formatLocation(booking.room?.location)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>{booking.provider?.username || "—"}</Box>
                  <Box sx={{ fontSize: "12px", color: "#6b7280" }}>
                    {booking.provider?.email || ""}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    {booking.checkIn ? convertToFormattedDate(booking.checkIn) : "—"}
                  </Box>
                  <Box sx={{ fontSize: "12px", color: "#6b7280" }}>
                    to {booking.checkOut ? convertToFormattedDate(booking.checkOut) : "—"}
                  </Box>
                </TableCell>
                <TableCell>
                  {booking.createdAt ? convertToFormattedDate(booking.createdAt) : "—"}
                </TableCell>
                <TableCell>
                  <Chip
                    label={formatStatusLabel(booking.status)}
                    color={getStatusChipColor(booking.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Chip
                      label={formatStatusLabel(booking.settlementStatus)}
                      color={getStatusChipColor(booking.settlementStatus)}
                      size="small"
                    />
                    <Typography variant="caption" sx={{ color: "#6b7280" }}>
                      {booking.settledAt
                        ? `Settled ${convertToFormattedDate(booking.settledAt)}`
                        : "Awaiting settlement"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {canSettle ? (
                    <AppButton
                      size="small"
                      onClick={() =>
                        setActionDialog({
                          open: true,
                          title: "Settle Booking",
                          body: "Mark this booking as settled? This records the payout as complete.",
                          onConfirm: () => handleSettleBooking(booking),
                        })
                      }
                      disabled={
                        activeBookingAction === booking._id && isSettlingBooking
                      }
                    >
                      Mark as Settled
                    </AppButton>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#6b7280" }}>
                      No action available
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </MUITable>
      )}
    </>
  );

  const sidebarItems: Array<{ value: AdminTab; label: string; badge?: number }> = [
    {
      value: "queue",
      label: "Moderation Queue",
      badge:
        (queueData?.pendingAccommodations ?? 0) +
        (queueData?.openReports ?? 0) +
        (queueData?.openDisputes ?? 0) +
        (queueData?.pendingReviews ?? 0),
    },
    {
      value: "accommodations",
      label: "Accommodations",
      badge: queueData?.pendingAccommodations,
    },
    { value: "reviews", label: "Review Moderation", badge: queueData?.pendingReviews },
    { value: "reports", label: "Reports", badge: queueData?.openReports },
    { value: "disputes", label: "Disputes", badge: queueData?.openDisputes },
    { value: "providers", label: "Providers" },
    { value: "bookings", label: "Bookings" },
    { value: "expired", label: "Expired Listings" },
    { value: "audit", label: "Audit Log" },
  ];

  return (
    <Box sx={{ mt: { xs: 5, md: 6 } }}>
      <AppContainer>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "220px 1fr" },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Paper
            sx={{
              p: 1,
              border: "1px solid #e5e7eb",
              boxShadow: "none",
              position: { md: "sticky" },
              top: { md: 80 },
            }}
          >
            {sidebarItems.map((item) => {
              const isActive = activeTab === item.value;

              return (
                <Box
                  key={item.value}
                  component="button"
                  type="button"
                  onClick={() => setActiveTab(item.value)}
                  sx={{
                    width: "100%",
                    border: 0,
                    borderRadius: "6px",
                    background: isActive ? "#e8f0fe" : "transparent",
                    color: isActive ? "#1a73e8" : "#374151",
                    fontWeight: isActive ? 700 : 500,
                    textAlign: "left",
                    px: 1.5,
                    py: 1.2,
                    mb: 0.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box component="span">{item.label}</Box>
                  {item.badge ? (
                    <Chip label={item.badge} color="error" size="small" />
                  ) : null}
                </Box>
              );
            })}
          </Paper>

          <Box>
            {activeTab === "queue" && renderModerationQueue()}
            {activeTab === "accommodations" && renderAccommodations()}
            {activeTab === "reviews" && renderReviewModeration()}
            {activeTab === "reports" && renderReports()}
            {activeTab === "disputes" && renderDisputes()}
            {activeTab === "providers" && renderProviders()}
            {activeTab === "bookings" && renderBookings()}
            {activeTab === "expired" && renderExpiredListings()}
            {activeTab === "audit" && renderAuditLog()}
          </Box>
        </Box>
      </AppContainer>

      <ToastAlert
        appearence={toast.open}
        type={toast.type}
        message={toast.message}
        handleClose={() => setToast((previous) => ({ ...previous, open: false }))}
      />
      <Dialog
        open={actionDialog.open}
        onClose={() =>
          setActionDialog({
            open: false,
            title: "",
            body: "",
            onConfirm: null,
          })
        }
      >
        <DialogTitle>{actionDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{actionDialog.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton
            variant="outlined"
            onClick={() =>
              setActionDialog({
                open: false,
                title: "",
                body: "",
                onConfirm: null,
              })
            }
          >
            Cancel
          </AppButton>
          <AppButton
            disabled={isVerifyingProvider || isSavingCommission || isSettlingBooking}
            onClick={() => {
              actionDialog.onConfirm?.();
              setActionDialog({
                open: false,
                title: "",
                body: "",
                onConfirm: null,
              });
            }}
          >
            Confirm
          </AppButton>
        </DialogActions>
      </Dialog>
      <Dialog open={textActionDialog.open} onClose={closeTextAction} fullWidth maxWidth="sm">
        <DialogTitle>{textActionDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{textActionDialog.body}</DialogContentText>
          <AppInput
            multiline
            minRows={3}
            label={textActionDialog.label}
            value={textActionDialog.value}
            onChange={(event) =>
              setTextActionDialog((previous) => ({
                ...previous,
                value: event.target.value,
              }))
            }
          />
        </DialogContent>
        <DialogActions>
          <AppButton variant="outlined" onClick={closeTextAction}>
            Cancel
          </AppButton>
          <AppButton
            disabled={!textActionDialog.value.trim()}
            onClick={() => {
              textActionDialog.onConfirm?.(textActionDialog.value.trim());
              closeTextAction();
            }}
          >
            Confirm
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
