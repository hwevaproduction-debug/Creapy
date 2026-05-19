import { apiSlice } from "./apiSlice";

interface InactiveListingsParams {
  province?: string;
  city?: string;
  expiredFrom?: string;
  expiredTo?: string;
  uploadedFrom?: string;
  uploadedTo?: string;
  landlord?: string;
  page?: number;
  limit?: number;
}

interface AdminListing {
  _id: string;
  name: string;
  user?: {
    username?: string;
    email?: string;
  };
  location?: {
    province?: string;
    city?: string;
  };
  createdAt?: string;
  paymentDeadline?: string;
}

interface InactiveListingsResponse {
  data: AdminListing[];
  total: number;
}

interface BulkReviveRequest {
  ids: string[];
}

export interface BulkReviveFailure {
  id: string;
  reason: string;
}

interface BulkReviveResponse {
  revived: string[];
  failed: BulkReviveFailure[];
}

export interface ProviderFilters {
  verificationStatus?: string;
  search?: string;
}

export interface ProviderRecord {
  _id: string;
  username: string;
  email?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  roomCount?: number;
  createdAt?: string | null;
  providerProfile: {
    verificationStatus: string;
    commissionRate: number;
    verifiedAt?: string | null;
    verificationNotes?: string | null;
    suspendedAt?: string | null;
    suspensionReason?: string | null;
  };
}

interface ProvidersResponse {
  data: ProviderRecord[];
  total: number;
}

interface VerifyProviderRequest {
  id: string;
  verificationStatus: "approved" | "rejected" | "pending";
  verificationNotes?: string;
}

interface UpdateCommissionRateRequest {
  id: string;
  commissionRate: number;
}

export interface BookingFilters {
  status?: string;
  provider?: string;
  dateFrom?: string;
  dateTo?: string;
  settlementStatus?: string;
}

export interface AdminBooking {
  _id: string;
  room?: {
    _id: string;
    name?: string | null;
    location?: {
      province?: string;
      city?: string;
    } | null;
  } | null;
  provider?: {
    _id: string;
    username?: string | null;
    email?: string | null;
  } | null;
  checkIn?: string;
  checkOut?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  settlementStatus?: string;
  settledAt?: string | null;
}

interface AdminBookingsResponse {
  data: AdminBooking[];
  total: number;
}

interface SettleBookingRequest {
  id: string;
  settlementReference?: string;
}

export interface ModerationQueueCounts {
  pendingAccommodations: number;
  openReports: number;
  openDisputes: number;
  pendingReviews: number;
}

export interface AdminAccommodationFilters {
  moderationStatus?: string;
  type?: string;
  province?: string;
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminAccommodation {
  _id: string;
  id?: string;
  name: string;
  type?: string;
  province?: string;
  city?: string;
  moderationStatus?: string;
  isPublished?: boolean;
  createdAt?: string;
  owner?: {
    _id?: string;
    id?: string;
    username?: string;
    email?: string;
  } | null;
}

interface AdminAccommodationsResponse {
  data: AdminAccommodation[];
  total: number;
}

interface ModerationActionRequest {
  id: string;
  reason?: string;
}

interface ProviderSuspensionRequest {
  id: string;
  reason?: string;
}

export interface AdminReviewFilters {
  isPublished?: string;
  accommodationId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminReview {
  _id: string;
  id?: string;
  overallRating?: number;
  comment?: string | null;
  isPublished?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  guest?: {
    _id?: string;
    username?: string;
  } | null;
  accommodation?: {
    _id?: string;
    name?: string;
  } | null;
}

interface AdminReviewsResponse {
  data: {
    reviews: AdminReview[];
  };
  total: number;
}

interface ReviewModerationRequest {
  id: string;
  action: "publish" | "unpublish" | "delete" | "restore";
}

export interface DisputeFilters {
  status?: string;
  raisedByRole?: string;
  bookingId?: string;
  page?: number;
  limit?: number;
}

export interface AdminDispute {
  _id: string;
  id?: string;
  bookingId?: string;
  raisedByRole?: string;
  reason?: string;
  description?: string;
  status?: string;
  resolution?: string | null;
  createdAt?: string;
  booking?: {
    _id?: string;
    checkIn?: string;
    checkOut?: string;
    room?: { name?: string } | null;
    guest?: { email?: string; username?: string } | null;
    provider?: { email?: string; username?: string } | null;
  } | null;
  raiser?: {
    username?: string;
    email?: string;
  } | null;
}

interface AdminDisputesResponse {
  data: AdminDispute[];
  total: number;
}

interface DisputeActionRequest {
  id: string;
  resolution?: string;
}

export interface ReportFilters {
  status?: string;
  targetType?: string;
  reason?: string;
  page?: number;
  limit?: number;
}

export interface AdminReport {
  _id: string;
  id?: string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  description?: string | null;
  status?: string;
  resolution?: string | null;
  createdAt?: string;
  reporter?: {
    username?: string;
    email?: string;
  } | null;
}

interface AdminReportsResponse {
  data: AdminReport[];
  total: number;
}

interface ReportActionRequest {
  id: string;
  resolution?: string;
}

export interface AuditLogFilters {
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminAuditLog {
  _id: string;
  id?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt?: string;
  admin?: {
    username?: string;
    email?: string;
  } | null;
}

interface AdminAuditLogsResponse {
  data: AdminAuditLog[];
  total: number;
}

function buildSearchParams(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInactiveListings: builder.query<InactiveListingsResponse, InactiveListingsParams>({
      query: (params) => ({
        url: `admin/listings/inactive${buildSearchParams(
          (params || {}) as Record<string, string | number | undefined>
        )}`,
        method: "GET",
      }),
      providesTags: ["AdminListing"],
    }),
    bulkReviveListings: builder.mutation<BulkReviveResponse, BulkReviveRequest>({
      query: ({ ids }) => ({
        url: "admin/listings/bulk-revive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: ["AdminListing"],
    }),
    getProviders: builder.query<ProvidersResponse, ProviderFilters | void>({
      query: (params) => ({
        url: `providers${buildSearchParams(
          (params || {}) as Record<string, string | number | undefined>
        )}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((provider) => ({
                type: "Provider" as const,
                id: provider._id,
              })),
              { type: "Provider" as const, id: "LIST" },
            ]
          : [{ type: "Provider" as const, id: "LIST" }],
    }),
    verifyProvider: builder.mutation<ProviderRecord, VerifyProviderRequest>({
      query: ({ id, ...body }) => ({
        url: `providers/${id}/verify`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: ProviderRecord }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Provider", id },
        { type: "Provider", id: "LIST" },
      ],
    }),
    updateCommissionRate: builder.mutation<ProviderRecord, UpdateCommissionRateRequest>({
      query: ({ id, commissionRate }) => ({
        url: `providers/${id}/commission`,
        method: "PUT",
        body: { commissionRate },
      }),
      transformResponse: (response: { data: ProviderRecord }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Provider", id },
        { type: "Provider", id: "LIST" },
      ],
    }),
    getAllBookings: builder.query<AdminBookingsResponse, BookingFilters | void>({
      query: (params) => ({
        url: `bookings${buildSearchParams(
          (params || {}) as Record<string, string | number | undefined>
        )}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((booking) => ({
                type: "AdminBooking" as const,
                id: booking._id,
              })),
              { type: "AdminBooking" as const, id: "LIST" },
            ]
          : [{ type: "AdminBooking" as const, id: "LIST" }],
    }),
    settleBooking: builder.mutation<AdminBooking, SettleBookingRequest>({
      query: ({ id, settlementReference }) => ({
        url: `bookings/${id}/settle`,
        method: "PUT",
        body: settlementReference ? { settlementReference } : {},
      }),
      transformResponse: (response: { data: AdminBooking }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminBooking", id },
        { type: "AdminBooking", id: "LIST" },
      ],
    }),
    getModerationQueue: builder.query<ModerationQueueCounts, void>({
      query: () => ({
        url: "admin/queue",
        method: "GET",
      }),
      transformResponse: (response: { data: ModerationQueueCounts }) => response.data,
      providesTags: ["AdminAccommodation", "AdminReview", "Dispute", "Report"],
    }),
    getAccommodations: builder.query<AdminAccommodationsResponse, AdminAccommodationFilters | void>({
      query: (params) => ({
        url: `admin/accommodations${buildSearchParams(
          (params || {}) as Record<string, string | number | undefined>
        )}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((accommodation) => ({
                type: "AdminAccommodation" as const,
                id: accommodation._id,
              })),
              { type: "AdminAccommodation" as const, id: "LIST" },
            ]
          : [{ type: "AdminAccommodation" as const, id: "LIST" }],
    }),
    approveAccommodation: builder.mutation<AdminAccommodation, ModerationActionRequest>({
      query: ({ id }) => ({
        url: `admin/accommodations/${id}/approve`,
        method: "PUT",
        body: {},
      }),
      transformResponse: (response: { data: { accommodation: AdminAccommodation } }) =>
        response.data.accommodation,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminAccommodation", id },
        { type: "AdminAccommodation", id: "LIST" },
        "AuditLog",
        "Report",
        "Dispute",
        "AdminReview",
      ],
    }),
    rejectAccommodation: builder.mutation<AdminAccommodation, ModerationActionRequest>({
      query: ({ id, reason }) => ({
        url: `admin/accommodations/${id}/reject`,
        method: "PUT",
        body: { reason },
      }),
      transformResponse: (response: { data: { accommodation: AdminAccommodation } }) =>
        response.data.accommodation,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminAccommodation", id },
        { type: "AdminAccommodation", id: "LIST" },
        "AuditLog",
      ],
    }),
    suspendAccommodation: builder.mutation<AdminAccommodation, ModerationActionRequest>({
      query: ({ id, reason }) => ({
        url: `admin/accommodations/${id}/suspend`,
        method: "PUT",
        body: { reason },
      }),
      transformResponse: (response: { data: { accommodation: AdminAccommodation } }) =>
        response.data.accommodation,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminAccommodation", id },
        { type: "AdminAccommodation", id: "LIST" },
        "AuditLog",
      ],
    }),
    reinstateAccommodation: builder.mutation<AdminAccommodation, ModerationActionRequest>({
      query: ({ id }) => ({
        url: `admin/accommodations/${id}/reinstate`,
        method: "PUT",
        body: {},
      }),
      transformResponse: (response: { data: { accommodation: AdminAccommodation } }) =>
        response.data.accommodation,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminAccommodation", id },
        { type: "AdminAccommodation", id: "LIST" },
        "AuditLog",
      ],
    }),
    suspendProvider: builder.mutation<ProviderRecord, ProviderSuspensionRequest>({
      query: ({ id, reason }) => ({
        url: `admin/providers/${id}/suspend`,
        method: "PUT",
        body: { reason },
      }),
      transformResponse: (response: { data: { provider: ProviderRecord } }) =>
        response.data.provider,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Provider", id },
        { type: "Provider", id: "LIST" },
        "AuditLog",
      ],
    }),
    reinstateProvider: builder.mutation<ProviderRecord, ProviderSuspensionRequest>({
      query: ({ id }) => ({
        url: `admin/providers/${id}/reinstate`,
        method: "PUT",
        body: {},
      }),
      transformResponse: (response: { data: { provider: ProviderRecord } }) =>
        response.data.provider,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Provider", id },
        { type: "Provider", id: "LIST" },
        "AuditLog",
      ],
    }),
    getAllReviews: builder.query<AdminReviewsResponse, AdminReviewFilters | void>({
      query: (params) => ({
        url: `admin/reviews${buildSearchParams(
          (params || {}) as Record<string, string | number | undefined>
        )}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.reviews.map((review) => ({
                type: "AdminReview" as const,
                id: review._id,
              })),
              { type: "AdminReview" as const, id: "LIST" },
            ]
          : [{ type: "AdminReview" as const, id: "LIST" }],
    }),
    moderateReview: builder.mutation<AdminReview, ReviewModerationRequest>({
      query: ({ id, action }) => ({
        url: `admin/reviews/${id}/moderate`,
        method: "PUT",
        body: { action },
      }),
      transformResponse: (response: { data: { review: AdminReview } }) =>
        response.data.review,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminReview", id },
        { type: "AdminReview", id: "LIST" },
      ],
    }),
    getDisputes: builder.query<AdminDisputesResponse, DisputeFilters | void>({
      query: (params) => ({
        url: `admin/disputes${buildSearchParams(
          (params || {}) as Record<string, string | number | undefined>
        )}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((dispute) => ({
                type: "Dispute" as const,
                id: dispute._id,
              })),
              { type: "Dispute" as const, id: "LIST" },
            ]
          : [{ type: "Dispute" as const, id: "LIST" }],
    }),
    getDisputeById: builder.query<{ dispute: AdminDispute }, string>({
      query: (id) => ({
        url: `admin/disputes/${id}`,
        method: "GET",
      }),
      transformResponse: (response: { data: { dispute: AdminDispute } }) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Dispute", id }],
    }),
    resolveDispute: builder.mutation<AdminDispute, DisputeActionRequest>({
      query: ({ id, resolution }) => ({
        url: `admin/disputes/${id}/resolve`,
        method: "POST",
        body: { resolution },
      }),
      transformResponse: (response: { data: { dispute: AdminDispute } }) =>
        response.data.dispute,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Dispute", id },
        { type: "Dispute", id: "LIST" },
        "AuditLog",
      ],
    }),
    closeDispute: builder.mutation<AdminDispute, DisputeActionRequest>({
      query: ({ id, resolution }) => ({
        url: `admin/disputes/${id}/close`,
        method: "POST",
        body: resolution ? { resolution } : {},
      }),
      transformResponse: (response: { data: { dispute: AdminDispute } }) =>
        response.data.dispute,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Dispute", id },
        { type: "Dispute", id: "LIST" },
        "AuditLog",
      ],
    }),
    getReports: builder.query<AdminReportsResponse, ReportFilters | void>({
      query: (params) => ({
        url: `admin/reports${buildSearchParams(
          (params || {}) as Record<string, string | number | undefined>
        )}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((report) => ({
                type: "Report" as const,
                id: report._id,
              })),
              { type: "Report" as const, id: "LIST" },
            ]
          : [{ type: "Report" as const, id: "LIST" }],
    }),
    getReportById: builder.query<{ report: AdminReport }, string>({
      query: (id) => ({
        url: `admin/reports/${id}`,
        method: "GET",
      }),
      transformResponse: (response: { data: { report: AdminReport } }) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Report", id }],
    }),
    reviewReport: builder.mutation<AdminReport, ReportActionRequest>({
      query: ({ id }) => ({
        url: `admin/reports/${id}/review`,
        method: "PUT",
        body: {},
      }),
      transformResponse: (response: { data: { report: AdminReport } }) =>
        response.data.report,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Report", id },
        { type: "Report", id: "LIST" },
        "AuditLog",
      ],
    }),
    resolveReport: builder.mutation<AdminReport, ReportActionRequest>({
      query: ({ id, resolution }) => ({
        url: `admin/reports/${id}/resolve`,
        method: "PUT",
        body: { resolution },
      }),
      transformResponse: (response: { data: { report: AdminReport } }) =>
        response.data.report,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Report", id },
        { type: "Report", id: "LIST" },
        "AuditLog",
      ],
    }),
    dismissReport: builder.mutation<AdminReport, ReportActionRequest>({
      query: ({ id, resolution }) => ({
        url: `admin/reports/${id}/dismiss`,
        method: "PUT",
        body: { resolution },
      }),
      transformResponse: (response: { data: { report: AdminReport } }) =>
        response.data.report,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Report", id },
        { type: "Report", id: "LIST" },
        "AuditLog",
      ],
    }),
    getAuditLogs: builder.query<AdminAuditLogsResponse, AuditLogFilters | void>({
      query: (params) => ({
        url: `admin/audit-logs${buildSearchParams(
          (params || {}) as Record<string, string | number | undefined>
        )}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((entry) => ({
                type: "AuditLog" as const,
                id: entry._id,
              })),
              { type: "AuditLog" as const, id: "LIST" },
            ]
          : [{ type: "AuditLog" as const, id: "LIST" }],
    }),
    getAuditLogById: builder.query<{ auditLog: AdminAuditLog }, string>({
      query: (id) => ({
        url: `admin/audit-logs/${id}`,
        method: "GET",
      }),
      transformResponse: (response: { data: { auditLog: AdminAuditLog } }) =>
        response.data,
      providesTags: (_result, _error, id) => [{ type: "AuditLog", id }],
    }),
  }),
});

export const {
  useGetInactiveListingsQuery,
  useLazyGetInactiveListingsQuery,
  useBulkReviveListingsMutation,
  useGetProvidersQuery,
  useVerifyProviderMutation,
  useUpdateCommissionRateMutation,
  useGetAllBookingsQuery,
  useSettleBookingMutation,
  useGetModerationQueueQuery,
  useGetAccommodationsQuery,
  useApproveAccommodationMutation,
  useRejectAccommodationMutation,
  useSuspendAccommodationMutation,
  useReinstateAccommodationMutation,
  useSuspendProviderMutation,
  useReinstateProviderMutation,
  useGetAllReviewsQuery,
  useModerateReviewMutation,
  useGetDisputesQuery,
  useGetDisputeByIdQuery,
  useResolveDisputeMutation,
  useCloseDisputeMutation,
  useGetReportsQuery,
  useGetReportByIdQuery,
  useReviewReportMutation,
  useResolveReportMutation,
  useDismissReportMutation,
  useGetAuditLogsQuery,
  useGetAuditLogByIdQuery,
} = adminApiSlice;
