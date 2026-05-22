require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const prisma = require("../../utils/prisma");

const API_BASE = process.env.SEED_API_BASE || "http://localhost:5000";

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const results = [];
let fatalGroupError = false;

const runSuffix = Date.now();
const runSuffixString = String(runSuffix);

const state = {
  landlordEmail: `landlord_${runSuffix}@test.creapy.com`,
  tenantEmail: `tenant_${runSuffix}@test.creapy.com`,
  providerEmail: `provider_${runSuffix}@test.creapy.com`,
  landlordUsername: `landlord_e2e_${runSuffix}`,
  tenantUsername: `tenant_e2e_${runSuffix}`,
  providerUsername: `provider_e2e_${runSuffix}`,
  landlordPhoneNumber: `+26377${runSuffixString.slice(-7)}`,
  providerPhoneNumber: `+26378${runSuffixString.slice(-7)}`,
  landlordNationalId: `63-${runSuffixString.slice(-3)}-45-67A`,
  providerNationalId: `63-${runSuffixString.slice(-3)}-99-12B`,
  adminEmail: process.env.E2E_ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || null,
  adminPassword: process.env.E2E_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || null,
  adminToken: null,
  landlordToken: null,
  landlordTokenFromSignup: false,
  landlordId: null,
  tenantToken: null,
  tenantId: null,
  providerToken: null,
  providerId: null,
  accommodationId: null,
  accommodationImageId: null,
  roomId: null,
  roomImageId: null,
  roomBlockId: null,
  seasonalRateId: null,
  roomFeeId: null,
  bookingId: null,
  bookingPaymentRef: null,
  disputeId: null,
  listingDraftId: null,
  engagementId: null,
  reportId: null,
  listingId: null,
  listingFeeRef: null,
  tenantPremiumRef: null,
  password: "TestPass123!",
};

async function api(method, path, body, token, formEncoded = false) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = formEncoded
      ? "application/x-www-form-urlencoded"
      : "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : formEncoded
          ? new URLSearchParams(body).toString()
          : JSON.stringify(body),
  });

  let parsedBody = null;

  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  return { status: response.status, body: parsedBody };
}

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true, detail: "" });
    console.log(`${green("PASS")}  ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, detail });
    console.log(`${red("FAIL")}  ${name} - ${detail}`);
  }
}

test.skip = async function skip(name, detail = "skipped") {
  results.push({ name, passed: false, skipped: true, detail });
  console.log(`${dim("SKIP")}  ${name} - ${detail}`);
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const compact = (values) => values.filter(Boolean);

async function cleanupWithPrisma() {
  if (!process.env.DATABASE_URL) {
    return;
  }

  const userIds = compact([state.landlordId, state.tenantId, state.providerId]);
  const listingIds = compact([state.listingId]);
  const bookingIds = compact([state.bookingId]);
  const roomIds = compact([state.roomId]);
  const accommodationIds = compact([state.accommodationId]);

  const safeDb = async (label, operation) => {
    try {
      await operation();
    } catch (error) {
      console.log(`${dim("cleanup")} ${label}: ${error.message}`);
    }
  };

  await safeDb("reports", () =>
    prisma.report?.deleteMany({
      where: {
        OR: compact([
          userIds.length ? { reporterId: { in: userIds } } : null,
          listingIds.length ? { targetId: { in: listingIds } } : null,
          accommodationIds.length ? { targetId: { in: accommodationIds } } : null,
          state.reportId ? { id: state.reportId } : null,
        ]),
      },
    })
  );
  await safeDb("disputes", () =>
    prisma.dispute?.deleteMany({
      where: {
        OR: compact([
          bookingIds.length ? { bookingId: { in: bookingIds } } : null,
          userIds.length ? { raisedBy: { in: userIds } } : null,
        ]),
      },
    })
  );
  await safeDb("reviews", () =>
    prisma.review?.deleteMany({
      where: {
        OR: compact([
          bookingIds.length ? { bookingId: { in: bookingIds } } : null,
          userIds.length ? { guestId: { in: userIds } } : null,
          accommodationIds.length ? { accommodationId: { in: accommodationIds } } : null,
        ]),
      },
    })
  );
  await safeDb("notifications", () =>
    prisma.notification?.deleteMany({
      where: userIds.length ? { userId: { in: userIds } } : { id: "__never__" },
    })
  );
  await safeDb("engagements", () =>
    prisma.engagement?.deleteMany({
      where: {
        OR: compact([
          state.engagementId ? { id: state.engagementId } : null,
          listingIds.length ? { listingId: { in: listingIds } } : null,
          userIds.length ? { tenantId: { in: userIds } } : null,
          userIds.length ? { landlordId: { in: userIds } } : null,
        ]),
      },
    })
  );
  await safeDb("saved searches", () =>
    prisma.savedSearch?.deleteMany({
      where: userIds.length ? { userId: { in: userIds } } : { id: "__never__" },
    })
  );
  await safeDb("listing drafts", () =>
    prisma.listingDraft?.deleteMany({
      where: userIds.length ? { userId: { in: userIds } } : { id: "__never__" },
    })
  );
  await safeDb("booking guest info", () =>
    prisma.bookingGuestInfo?.deleteMany({
      where: bookingIds.length ? { bookingId: { in: bookingIds } } : { id: "__never__" },
    })
  );
  await safeDb("booking fee snapshots", () =>
    prisma.bookingFeeSnapshot?.deleteMany({
      where: bookingIds.length ? { bookingId: { in: bookingIds } } : { id: "__never__" },
    })
  );
  await safeDb("refunds", () =>
    prisma.refund?.deleteMany({
      where: bookingIds.length ? { bookingId: { in: bookingIds } } : { id: "__never__" },
    })
  );
  await safeDb("payments", () =>
    prisma.payment?.deleteMany({
      where: {
        OR: compact([
          userIds.length ? { userId: { in: userIds } } : null,
          listingIds.length ? { listingId: { in: listingIds } } : null,
          bookingIds.length ? { bookingId: { in: bookingIds } } : null,
        ]),
      },
    })
  );
  await safeDb("bookings", () =>
    prisma.booking?.deleteMany({
      where: bookingIds.length ? { id: { in: bookingIds } } : { id: "__never__" },
    })
  );
  await safeDb("availability blocks", () =>
    prisma.availabilityBlock?.deleteMany({
      where: roomIds.length ? { roomId: { in: roomIds } } : { id: "__never__" },
    })
  );
  await safeDb("room images", () =>
    prisma.roomImage?.deleteMany({
      where: roomIds.length ? { roomId: { in: roomIds } } : { id: "__never__" },
    })
  );
  await safeDb("room amenities", () =>
    prisma.roomAmenity?.deleteMany({
      where: roomIds.length ? { roomId: { in: roomIds } } : { roomId: "__never__" },
    })
  );
  await safeDb("seasonal rates", () =>
    prisma.seasonalRate?.deleteMany({
      where: roomIds.length ? { roomId: { in: roomIds } } : { id: "__never__" },
    })
  );
  await safeDb("room fees", () =>
    prisma.roomFee?.deleteMany({
      where: roomIds.length ? { roomId: { in: roomIds } } : { id: "__never__" },
    })
  );
  await safeDb("occupancy rules", () =>
    prisma.occupancyRule?.deleteMany({
      where: roomIds.length ? { roomId: { in: roomIds } } : { id: "__never__" },
    })
  );
  await safeDb("occupancy pricing rules", () =>
    prisma.occupancyPricingRule?.deleteMany({
      where: roomIds.length ? { roomId: { in: roomIds } } : { id: "__never__" },
    })
  );
  await safeDb("rooms", () =>
    prisma.room?.deleteMany({
      where: roomIds.length ? { id: { in: roomIds } } : { id: "__never__" },
    })
  );
  await safeDb("accommodation images", () =>
    prisma.accommodationImage?.deleteMany({
      where: accommodationIds.length
        ? { accommodationId: { in: accommodationIds } }
        : { id: "__never__" },
    })
  );
  await safeDb("accommodation amenities", () =>
    prisma.accommodationAmenity?.deleteMany({
      where: accommodationIds.length
        ? { accommodationId: { in: accommodationIds } }
        : { accommodationId: "__never__" },
    })
  );
  await safeDb("cancellation policies", () =>
    prisma.cancellationPolicy?.deleteMany({
      where: accommodationIds.length
        ? { accommodationId: { in: accommodationIds } }
        : { id: "__never__" },
    })
  );
  await safeDb("check-in rules", () =>
    prisma.checkInOutRules?.deleteMany({
      where: accommodationIds.length
        ? { accommodationId: { in: accommodationIds } }
        : { id: "__never__" },
    })
  );
  await safeDb("tax rules", () =>
    prisma.taxRule?.deleteMany({
      where: accommodationIds.length
        ? { accommodationId: { in: accommodationIds } }
        : { id: "__never__" },
    })
  );
  await safeDb("accommodations", () =>
    prisma.accommodation?.deleteMany({
      where: accommodationIds.length
        ? { id: { in: accommodationIds } }
        : state.providerId
          ? { ownerId: state.providerId }
          : { id: "__never__" },
    })
  );
  await safeDb("listings", () =>
    prisma.listing?.deleteMany({
      where: listingIds.length ? { id: { in: listingIds } } : { id: "__never__" },
    })
  );
  await safeDb("users", () =>
    prisma.user?.deleteMany({
      where: userIds.length ? { id: { in: userIds } } : { id: "__never__" },
    })
  );
}

function printSummary() {
  const passed = results.filter((result) => result.passed).length;
  const skipped = results.filter((result) => result.skipped).length;
  const failed = results.filter((result) => !result.passed && !result.skipped).length;

  console.log("-------------------------------------");
  console.log(`${passed}/${results.length} tests passed`);
  if (skipped > 0) {
    console.log(`${skipped} test(s) skipped`);
  }

  if (failed > 0) {
    console.log(`${failed} test(s) failed`);
    process.exit(1);
  }

  if (fatalGroupError) {
    console.log("Fatal group error encountered");
    process.exit(1);
  }
}

async function cleanup() {
  if (state.listingId && state.landlordToken) {
    try {
      await api("DELETE", `/api/v1/listings/${state.listingId}`, undefined, state.landlordToken);
    } catch {}
  }

  if (state.landlordId && state.landlordToken) {
    try {
      await api(
        "DELETE",
        `/api/v1/users/delete/${state.landlordId}`,
        undefined,
        state.landlordToken
      );
    } catch {}
  }

  if (state.tenantId && state.tenantToken) {
    try {
      await api("DELETE", `/api/v1/users/delete/${state.tenantId}`, undefined, state.tenantToken);
    } catch {}
  }

  await cleanupWithPrisma();

  try {
    await prisma.$disconnect();
  } catch {}
}

async function runTests() {
  console.log("Running Creapy API E2E Tests");
  console.log(`API: ${dim(API_BASE)}`);
  console.log("-------------------------------------");

  try {
    const groups = [
      { name: "Auth", module: require("./auth") },
      { name: "Listing Drafts", module: require("./listing-drafts") },
      { name: "Listings", module: require("./listings") },
      { name: "Payments", module: require("./payments") },
      { name: "Engagements and Notifications", module: require("./engagements") },
      { name: "Saved Searches", module: require("./saved-searches") },
      { name: "Reports and Leads", module: require("./reports-and-leads") },
      { name: "Provider Stays and Bookings", module: require("./stays") },
      { name: "Profile", module: require("./profile") },
    ];

    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index];
      try {
        await group.module.run(state, api, assert, test);
      } catch (err) {
        fatalGroupError = true;
        console.log(`\n[FATAL] ${group.name} group failed: ${err.message}`);
        for (const skippedGroup of groups.slice(index + 1)) {
          results.push({
            name: `${skippedGroup.name} group skipped due to fail-fast`,
            passed: false,
            skipped: true,
            detail: "skipped after fatal group failure",
          });
        }
        console.log("Remaining groups skipped.");
        break;
      }
    }
  } finally {
    await cleanup();
    printSummary();
  }
}

runTests();
