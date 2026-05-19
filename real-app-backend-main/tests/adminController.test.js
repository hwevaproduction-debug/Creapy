const test = require("node:test");
const assert = require("node:assert/strict");

const emailUtils = require("../utils/email");
const notificationService = require("../utils/notificationService");
const prisma = require("../utils/prisma");

const originalSendEmail = emailUtils.sendEmail;
const originalEnqueue = notificationService.enqueue;
const originalPrisma = {
  transaction: prisma.$transaction,
  listingCount: prisma.listing.count,
  listingFindMany: prisma.listing.findMany,
  listingFindUnique: prisma.listing.findUnique,
  listingUpdate: prisma.listing.update,
  accommodationCount: prisma.accommodation.count,
  accommodationFindMany: prisma.accommodation.findMany,
  accommodationFindUnique: prisma.accommodation.findUnique,
  accommodationUpdate: prisma.accommodation.update,
  auditLogCount: prisma.auditLog.count,
  auditLogCreate: prisma.auditLog.create,
  auditLogFindMany: prisma.auditLog.findMany,
  auditLogFindUnique: prisma.auditLog.findUnique,
  disputeCount: prisma.dispute.count,
  reportCount: prisma.report.count,
  reviewCount: prisma.review.count,
  roomGroupBy: prisma.room.groupBy,
  userFindMany: prisma.user.findMany,
  userFindUnique: prisma.user.findUnique,
  userUpdate: prisma.user.update,
};

const loadAdminController = () => {
  delete require.cache[require.resolve("../controllers/adminController")];
  return require("../controllers/adminController");
};

const invokeController = (handler, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve({ statusCode: this.statusCode, body: this.body });
      },
    };

    handler(req, res, (err) => {
      if (err) {
        resolve({ error: err });
      } else {
        reject(new Error("Expected controller to resolve or error"));
      }
    });
  });

test.afterEach(() => {
  emailUtils.sendEmail = originalSendEmail;
  notificationService.enqueue = originalEnqueue;
  prisma.$transaction = originalPrisma.transaction;
  prisma.listing.count = originalPrisma.listingCount;
  prisma.listing.findMany = originalPrisma.listingFindMany;
  prisma.listing.findUnique = originalPrisma.listingFindUnique;
  prisma.listing.update = originalPrisma.listingUpdate;
  prisma.accommodation.count = originalPrisma.accommodationCount;
  prisma.accommodation.findMany = originalPrisma.accommodationFindMany;
  prisma.accommodation.findUnique = originalPrisma.accommodationFindUnique;
  prisma.accommodation.update = originalPrisma.accommodationUpdate;
  prisma.auditLog.count = originalPrisma.auditLogCount;
  prisma.auditLog.create = originalPrisma.auditLogCreate;
  prisma.auditLog.findMany = originalPrisma.auditLogFindMany;
  prisma.auditLog.findUnique = originalPrisma.auditLogFindUnique;
  prisma.dispute.count = originalPrisma.disputeCount;
  prisma.report.count = originalPrisma.reportCount;
  prisma.review.count = originalPrisma.reviewCount;
  prisma.room.groupBy = originalPrisma.roomGroupBy;
  prisma.user.findMany = originalPrisma.userFindMany;
  prisma.user.findUnique = originalPrisma.userFindUnique;
  prisma.user.update = originalPrisma.userUpdate;
});

test("admin routes expose inactive listings and bulk revive endpoints", async () => {
  const adminRoutes = require("../routes/adminRoutes");
  const routeLayers = adminRoutes.stack.filter((layer) => layer.route);

  const inactiveLayer = routeLayers.find(
    (layer) =>
      layer.route.path === "/listings/inactive" && layer.route.methods.get
  );
  const reviveLayer = routeLayers.find(
    (layer) =>
      layer.route.path === "/listings/bulk-revive" && layer.route.methods.post
  );

  assert.ok(inactiveLayer);
  assert.ok(reviveLayer);
  assert.ok(
    routeLayers.find((layer) => layer.route.path === "/queue" && layer.route.methods.get)
  );
  assert.ok(
    routeLayers.find(
      (layer) =>
        layer.route.path === "/accommodations/:id/approve" &&
        layer.route.methods.put
    )
  );
  assert.ok(
    routeLayers.find(
      (layer) =>
        layer.route.path === "/reviews/:id/moderate" &&
        layer.route.methods.put
    )
  );
  assert.ok(
    routeLayers.find(
      (layer) =>
        layer.route.path === "/disputes/:id/review" &&
        layer.route.methods.post
    )
  );
});

test("getInactiveListings returns paginated inactive listings", async () => {
  const adminController = loadAdminController();

  let countArgs = null;
  let findArgs = null;

  prisma.listing.count = async (args) => {
    countArgs = args;
    return 1;
  };

  prisma.listing.findMany = async (args) => {
    findArgs = args;
    return [
      {
        id: "listing-1",
        name: "Dorm room",
        status: "inactive",
        user: { username: "owner", email: "owner@example.com" },
      },
    ];
  };

  const result = await invokeController(adminController.getInactiveListings, {
    query: { page: "1", limit: "10" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, "success");
  assert.equal(result.body.total, 1);
  assert.equal(result.body.results, 1);
  assert.deepEqual(countArgs, { where: { status: "inactive" } });
  assert.deepEqual(findArgs.where, { status: "inactive" });
  assert.equal(findArgs.skip, 0);
  assert.equal(findArgs.take, 10);
  assert.deepEqual(findArgs.orderBy, { paymentDeadline: "asc" });
});

test("getInactiveListings combines landlord, location, and date filters", async () => {
  const adminController = loadAdminController();

  let countArgs = null;
  let findArgs = null;

  prisma.user.findMany = async () => [{ id: "user_1" }, { id: "user_2" }];
  prisma.listing.count = async (args) => {
    countArgs = args;
    return 2;
  };
  prisma.listing.findMany = async (args) => {
    findArgs = args;
    return [
      { id: "listing_1", status: "inactive", user: { username: "one", email: "one@example.com" } },
      { id: "listing_2", status: "inactive", user: { username: "two", email: "two@example.com" } },
    ];
  };

  const result = await invokeController(adminController.getInactiveListings, {
    query: {
      landlord: "owner",
      province: "Harare",
      city: "Avondale",
      expiredFrom: "2025-01-01T00:00:00.000Z",
      expiredTo: "2025-01-31T00:00:00.000Z",
      uploadedFrom: "2024-12-01T00:00:00.000Z",
      uploadedTo: "2024-12-31T00:00:00.000Z",
      page: "2",
      limit: "5",
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.total, 2);
  assert.equal(result.body.results, 2);
  assert.deepEqual(countArgs.where.userId, { in: ["user_1", "user_2"] });
  assert.deepEqual(findArgs.where.userId, { in: ["user_1", "user_2"] });
  assert.equal(countArgs.where.status, "inactive");
  assert.equal(findArgs.where.status, "inactive");
  assert.deepEqual(countArgs.where.province, {
    contains: "Harare",
    mode: "insensitive",
  });
  assert.deepEqual(countArgs.where.city, {
    contains: "Avondale",
    mode: "insensitive",
  });
  assert.equal(
    countArgs.where.paymentDeadline.gte.toISOString(),
    "2025-01-01T00:00:00.000Z"
  );
  assert.equal(
    countArgs.where.paymentDeadline.lte.toISOString(),
    "2025-01-31T00:00:00.000Z"
  );
  assert.equal(
    countArgs.where.createdAt.gte.toISOString(),
    "2024-12-01T00:00:00.000Z"
  );
  assert.equal(
    countArgs.where.createdAt.lte.toISOString(),
    "2024-12-31T00:00:00.000Z"
  );
  assert.equal(findArgs.skip, 5);
  assert.equal(findArgs.take, 5);
  assert.deepEqual(findArgs.orderBy, { paymentDeadline: "asc" });
});

test("getInactiveListings returns empty results when landlord search has no matches", async () => {
  const adminController = loadAdminController();
  let listingQueries = 0;

  prisma.user.findMany = async () => [];
  prisma.listing.count = async () => {
    listingQueries += 1;
    return 0;
  };
  prisma.listing.findMany = async () => {
    listingQueries += 1;
    throw new Error("prisma.listing.findMany should not be called");
  };

  const result = await invokeController(adminController.getInactiveListings, {
    query: { landlord: "missing-owner" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    status: "success",
    total: 0,
    results: 0,
    data: [],
  });
  assert.equal(listingQueries, 0);
});

test("bulkReviveListings revives inactive listings, ignores email failure, and reports failures", async () => {
  const adminController = loadAdminController();

  const updatedIds = [];
  const emailedIds = [];
  const listingsById = {
    "507f1f77bcf86cd799439011": {
      id: "507f1f77bcf86cd799439011",
      name: "Revive me",
      status: "inactive",
      userId: "user_1",
      user: { username: "owner1", email: "owner1@example.com" },
    },
    "507f1f77bcf86cd799439012": {
      id: "507f1f77bcf86cd799439012",
      name: "Already active",
      status: "active",
      userId: "user_2",
      user: { username: "owner2", email: null },
    },
  };

  prisma.listing.findUnique = async ({ where }) => listingsById[where.id] || null;
  prisma.listing.count = async ({ where }) => (where.userId === "user_1" ? 0 : 1);
  prisma.listing.update = async ({ where }) => {
    updatedIds.push(where.id);
    return { id: where.id };
  };
  emailUtils.sendEmail = async ({ to }) => {
    emailedIds.push(to);
    throw new Error("smtp down");
  };

  const result = await invokeController(adminController.bulkReviveListings, {
    body: {
      ids: [
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
        "not-an-object-id",
      ],
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, "success");
  assert.deepEqual(result.body.revived, ["507f1f77bcf86cd799439011"]);
  assert.deepEqual(result.body.failed, [
    {
      id: "507f1f77bcf86cd799439012",
      reason: "Listing is not inactive",
    },
    {
      id: "not-an-object-id",
      reason: "Listing not found",
    },
  ]);
  assert.deepEqual(updatedIds, ["507f1f77bcf86cd799439011"]);
  assert.deepEqual(emailedIds, ["owner1@example.com"]);
});

test("bulkReviveListings rejects oversized batches", async () => {
  const adminController = loadAdminController();

  let findUniqueCalls = 0;
  prisma.listing.findUnique = async () => {
    findUniqueCalls += 1;
    return null;
  };

  const result = await invokeController(adminController.bulkReviveListings, {
    body: {
      ids: Array.from({ length: 101 }, (_, index) => String(index + 1)),
    },
  });

  assert.ok(result.error);
  assert.equal(result.error.statusCode, 400);
  assert.equal(
    result.error.message,
    "Cannot revive more than 100 listings at once"
  );
  assert.equal(findUniqueCalls, 0);
});

test("getAccommodations returns paginated moderation results with filters", async () => {
  const adminController = loadAdminController();
  let countArgs = null;
  let findArgs = null;

  prisma.accommodation.count = async (args) => {
    countArgs = args;
    return 1;
  };
  prisma.accommodation.findMany = async (args) => {
    findArgs = args;
    return [
      {
        id: "acc_1",
        name: "Sunset Lodge",
        type: "LODGE",
        province: "Harare",
        city: "Avondale",
        moderationStatus: "PENDING_REVIEW",
        isPublished: false,
        owner: { id: "provider_1", username: "host", email: "host@example.com" },
      },
    ];
  };

  const result = await invokeController(adminController.getAccommodations, {
    query: {
      moderationStatus: "pending_review",
      type: "lodge",
      province: "Harare",
      search: "sunset",
      page: "2",
      limit: "5",
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.total, 1);
  assert.equal(result.body.data[0]._id, "acc_1");
  assert.equal(countArgs.where.moderationStatus, "PENDING_REVIEW");
  assert.equal(countArgs.where.type, "LODGE");
  assert.deepEqual(countArgs.where.province, {
    contains: "Harare",
    mode: "insensitive",
  });
  assert.equal(findArgs.skip, 5);
  assert.equal(findArgs.take, 5);
});

test("approveAccommodation publishes the accommodation and writes audit log", async () => {
  const adminController = loadAdminController();
  const auditEntries = [];
  let updateArgs = null;
  let notificationEvent = null;

  prisma.accommodation.findUnique = async () => ({
    id: "acc_1",
    moderationStatus: "PENDING_REVIEW",
    isPublished: false,
    owner: { id: "provider_1", email: "host@example.com", username: "host" },
  });
  prisma.accommodation.update = async (args) => {
    updateArgs = args;
    return {
      id: "acc_1",
      name: "Sunset Lodge",
      moderationStatus: "APPROVED",
      isPublished: true,
      owner: { id: "provider_1", email: "host@example.com", username: "host" },
    };
  };
  prisma.auditLog.create = async ({ data }) => {
    auditEntries.push(data);
    return { id: "audit_1", ...data };
  };
  notificationService.enqueue = async (event) => {
    notificationEvent = event;
    return { count: 1 };
  };

  const result = await invokeController(adminController.approveAccommodation, {
    params: { id: "acc_1" },
    body: {},
    user: { id: "admin_1" },
    ip: "127.0.0.1",
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(updateArgs.data, {
    moderationStatus: "APPROVED",
    isPublished: true,
  });
  assert.equal(auditEntries[0].adminId, "admin_1");
  assert.equal(auditEntries[0].action, "accommodation.approved");
  assert.equal(notificationEvent, "accommodation.approved");
});

test("audit log failure does not cause accommodation approval to fail", async () => {
  const adminController = loadAdminController();

  prisma.accommodation.findUnique = async () => ({
    id: "acc_1",
    moderationStatus: "PENDING_REVIEW",
    isPublished: false,
    owner: { id: "provider_1", email: "host@example.com", username: "host" },
  });
  prisma.accommodation.update = async () => ({
    id: "acc_1",
    name: "Sunset Lodge",
    moderationStatus: "APPROVED",
    isPublished: true,
    owner: { id: "provider_1", email: "host@example.com", username: "host" },
  });
  prisma.auditLog.create = async () => {
    throw new Error("audit unavailable");
  };
  notificationService.enqueue = async () => ({ count: 1 });

  const result = await invokeController(adminController.approveAccommodation, {
    params: { id: "acc_1" },
    body: {},
    user: { id: "admin_1" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data.accommodation.moderationStatus, "APPROVED");
});

test("rejectAccommodation requires a reason", async () => {
  const adminController = loadAdminController();

  const result = await invokeController(adminController.rejectAccommodation, {
    params: { id: "acc_1" },
    body: {},
    user: { id: "admin_1" },
  });

  assert.equal(result.error.statusCode, 400);
  assert.equal(result.error.message, "reason is required");
});

test("reject, suspend, and reinstate accommodation set the expected moderation status", async () => {
  const adminController = loadAdminController();
  const updateStatuses = [];

  prisma.accommodation.findUnique = async () => ({
    id: "acc_1",
    moderationStatus: "APPROVED",
    isPublished: true,
    owner: { id: "provider_1", email: "host@example.com", username: "host" },
  });
  prisma.accommodation.update = async ({ data }) => {
    updateStatuses.push(data);
    return {
      id: "acc_1",
      name: "Sunset Lodge",
      ...data,
      owner: { id: "provider_1", email: "host@example.com", username: "host" },
    };
  };
  prisma.auditLog.create = async ({ data }) => ({ id: "audit_1", ...data });
  notificationService.enqueue = async () => ({ count: 1 });

  await invokeController(adminController.rejectAccommodation, {
    params: { id: "acc_1" },
    body: { reason: "Incomplete details" },
    user: { id: "admin_1" },
  });
  await invokeController(adminController.suspendAccommodation, {
    params: { id: "acc_1" },
    body: { reason: "Fraud report" },
    user: { id: "admin_1" },
  });
  await invokeController(adminController.reinstateAccommodation, {
    params: { id: "acc_1" },
    body: {},
    user: { id: "admin_1" },
  });

  assert.deepEqual(updateStatuses, [
    { moderationStatus: "REJECTED", isPublished: false },
    { moderationStatus: "SUSPENDED", isPublished: false },
    { moderationStatus: "APPROVED", isPublished: true },
  ]);
});

test("getModerationQueue returns all moderation counts", async () => {
  const adminController = loadAdminController();

  prisma.accommodation.count = async () => 5;
  prisma.report.count = async () => 6;
  prisma.dispute.count = async () => 3;
  prisma.review.count = async () => 2;

  const result = await invokeController(adminController.getModerationQueue, {
    query: {},
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.data, {
    pendingAccommodations: 5,
    openReports: 6,
    openDisputes: 3,
    pendingReviews: 2,
  });
});

test("getProviders serializes provider suspension fields", async () => {
  const adminController = loadAdminController();

  prisma.room.groupBy = async () => [
    {
      providerId: "provider_1",
      _count: { id: 2 },
    },
  ];
  prisma.user.findMany = async () => [
    {
      id: "provider_1",
      username: "host",
      email: "host@example.com",
      providerProfile: {
        verificationStatus: "approved",
        commissionRate: 10,
        suspendedAt: "2026-05-19T00:00:00.000Z",
        suspensionReason: "Fraud risk",
      },
    },
  ];

  const result = await invokeController(adminController.getProviders, {
    query: {},
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data[0].roomCount, 2);
  assert.equal(
    result.body.data[0].providerProfile.suspendedAt,
    "2026-05-19T00:00:00.000Z"
  );
  assert.equal(
    result.body.data[0].providerProfile.suspensionReason,
    "Fraud risk"
  );
});

test("suspendProvider and reinstateProvider update providerProfile suspension fields", async () => {
  const adminController = loadAdminController();
  const updates = [];

  prisma.user.findUnique = async () => ({
    id: "provider_1",
    username: "host",
    email: "host@example.com",
    providerProfile: {
      verificationStatus: "approved",
      commissionRate: 10,
    },
  });
  prisma.user.update = async ({ data }) => {
    updates.push(data.providerProfile);
    return {
      id: "provider_1",
      username: "host",
      email: "host@example.com",
      providerProfile: data.providerProfile,
    };
  };
  prisma.auditLog.create = async ({ data }) => ({ id: "audit_1", ...data });
  notificationService.enqueue = async () => ({ count: 1 });

  const suspended = await invokeController(adminController.suspendProvider, {
    params: { id: "provider_1" },
    body: { reason: "Fraud risk" },
    user: { id: "admin_1" },
  });
  const reinstated = await invokeController(adminController.reinstateProvider, {
    params: { id: "provider_1" },
    body: {},
    user: { id: "admin_1" },
  });

  assert.equal(suspended.statusCode, 200);
  assert.equal(reinstated.statusCode, 200);
  assert.equal(updates[0].suspensionReason, "Fraud risk");
  assert.ok(updates[0].suspendedAt);
  assert.equal(updates[1].suspendedAt, undefined);
  assert.equal(updates[1].suspensionReason, undefined);
  assert.ok(suspended.body.data.provider.providerProfile.suspendedAt);
  assert.equal(
    suspended.body.data.provider.providerProfile.suspensionReason,
    "Fraud risk"
  );
  assert.equal(reinstated.body.data.provider.providerProfile.suspendedAt, null);
  assert.equal(
    reinstated.body.data.provider.providerProfile.suspensionReason,
    null
  );
});

test("getAuditLogs returns paginated filtered audit entries", async () => {
  const adminController = loadAdminController();
  let countArgs = null;
  let findArgs = null;

  prisma.auditLog.count = async (args) => {
    countArgs = args;
    return 1;
  };
  prisma.auditLog.findMany = async (args) => {
    findArgs = args;
    return [
      {
        id: "audit_1",
        adminId: "admin_1",
        action: "provider.suspended",
        targetType: "User",
        targetId: "provider_1",
        metadata: { reason: "Fraud" },
        admin: { id: "admin_1", email: "admin@example.com" },
        createdAt: new Date("2026-05-19T00:00:00.000Z"),
      },
    ];
  };

  const result = await invokeController(adminController.getAuditLogs, {
    query: {
      adminSearch: "admin@example.com",
      action: "provider.suspended",
      targetType: "User",
      targetId: "provider_1",
      from: "2026-05-01",
      to: "2026-05-31",
      page: "2",
      limit: "10",
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.total, 1);
  assert.equal(countArgs.where.adminId, undefined);
  assert.deepEqual(countArgs.where.OR, [
    { adminId: "admin@example.com" },
    {
      admin: {
        is: {
          email: {
            contains: "admin@example.com",
            mode: "insensitive",
          },
        },
      },
    },
  ]);
  assert.equal(countArgs.where.action, "provider.suspended");
  assert.equal(countArgs.where.createdAt.gte instanceof Date, true);
  assert.equal(findArgs.skip, 10);
  assert.equal(findArgs.take, 10);
});

test("createBooking rejects rooms owned by suspended providers", async () => {
  const bookingController = require("../controllers/bookingController");

  prisma.$transaction = async (callback) =>
    callback({
      $queryRaw: async () => [],
      room: {
        findUnique: async () => ({
          id: "room_1",
          providerId: "provider_1",
          provider: {
            id: "provider_1",
            providerProfile: {
              suspendedAt: "2026-05-19T00:00:00.000Z",
              suspensionReason: "Fraud",
            },
          },
          accommodation: {
            ownerId: "provider_1",
            timezone: "Africa/Harare",
          },
        }),
      },
    });

  const result = await invokeController(bookingController.createBooking, {
    body: {
      roomId: "room_1",
      checkIn: "2026-06-01",
      checkOut: "2026-06-03",
    },
    user: { id: "guest_1" },
  });

  assert.equal(result.error.statusCode, 403);
  assert.equal(result.error.message, "This provider is currently suspended");
});
