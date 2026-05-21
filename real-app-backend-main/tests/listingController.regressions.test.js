const test = require("node:test");
const assert = require("node:assert/strict");

const listingController = require("../controllers/listingController");
const prisma = require("../utils/prisma");

const originalListing = {
  ...prisma.listing,
};

const assertPublicContactFieldsAbsent = (listing) => {
  assert.equal(Object.prototype.hasOwnProperty.call(listing, "phoneNumber"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(listing, "address"), false);
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
  prisma.listing.findUnique = originalListing.findUnique;
  prisma.listing.findMany = originalListing.findMany;
  prisma.listing.update = originalListing.update;
  prisma.listing.updateMany = originalListing.updateMany;
});

test("getListing hides pending payment listings from non-owners", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_1",
    userId: "owner_1",
    status: "pending_payment",
    province: "Harare",
    city: "Avondale",
    addressLine: "12 King George Road",
  });

  const result = await invokeController(listingController.getListing, {
    params: { id: "listing_1" },
    user: { id: "tenant_1", role: "tenant", isPremium: false },
  });

  assert.equal(result.error.statusCode, 404);
  assert.equal(result.error.message, "No listing found with that ID");
});

test("getListing hides early access listings from non-premium users and preserves location shape", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_2",
    userId: "owner_1",
    status: "early_access",
    province: "Harare",
    city: "Borrowdale",
    addressLine: "1 Samora Machel Ave",
  });

  const blocked = await invokeController(listingController.getListing, {
    params: { id: "listing_2" },
    user: { id: "tenant_1", role: "tenant" },
  });

  assert.equal(blocked.error.statusCode, 404);

  const allowed = await invokeController(listingController.getListing, {
    params: { id: "listing_2" },
    user: {
      id: "tenant_2",
      role: "tenant",
      premiumExpiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  });

  assert.equal(allowed.statusCode, 200);
  assert.deepEqual(allowed.body.data.location, {
    province: "Harare",
    city: "Borrowdale",
    addressLine: "1 Samora Machel Ave",
    country: "Zimbabwe",
  });
  assert.equal(allowed.body.data.province, "Harare");
});

test("getListing strips landlord contact fields from public detail responses", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_public_detail",
    userId: "owner_1",
    status: "active",
    province: "Harare",
    city: "Avondale",
    addressLine: "12 King George Road",
    address: "12 King George Road, Avondale",
    phoneNumber: "+263771234567",
  });

  const result = await invokeController(listingController.getListing, {
    params: { id: "listing_public_detail" },
    user: { id: "tenant_1", role: "tenant" },
  });

  assert.equal(result.statusCode, 200);
  assertPublicContactFieldsAbsent(result.body.data);
});

test("getListing keeps landlord contact fields for the owner", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_owner_detail",
    userId: "owner_1",
    status: "active",
    province: "Harare",
    city: "Avondale",
    address: "12 King George Road, Avondale",
    phoneNumber: "+263771234567",
  });

  const result = await invokeController(listingController.getListing, {
    params: { id: "listing_owner_detail" },
    user: { id: "owner_1", role: "landlord" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data.address, "12 King George Road, Avondale");
  assert.equal(result.body.data.phoneNumber, "+263771234567");
});

test("updateListing rejects lifecycle-managed fields", async () => {
  let updateCalled = false;

  prisma.listing.findUnique = async () => ({
    id: "listing_3",
    userId: "owner_1",
  });
  prisma.listing.update = async () => {
    updateCalled = true;
    return {};
  };

  const result = await invokeController(listingController.updateListing, {
    params: { id: "listing_3" },
    user: { id: "owner_1" },
    body: { status: "inactive", name: "Renamed listing" },
  });

  assert.equal(result.error.statusCode, 400);
  assert.equal(
    result.error.message,
    "Listing lifecycle fields cannot be updated from this endpoint."
  );
  assert.equal(updateCalled, false);
});

test("transitionListingToPendingPayment enforces active status and valid payment window", async () => {
  prisma.listing.findUnique = async () => ({
    id: "listing_4",
    userId: "owner_1",
    status: "inactive",
    paymentDeadline: new Date(Date.now() + 60 * 60 * 1000),
  });

  const inactiveResult = await invokeController(
    listingController.transitionListingToPendingPayment,
    {
      params: { id: "listing_4" },
      user: { id: "owner_1" },
    }
  );

  assert.equal(inactiveResult.error.statusCode, 400);
  assert.equal(
    inactiveResult.error.message,
    "Only active listings can be transitioned to pending payment."
  );

  prisma.listing.findUnique = async () => ({
    id: "listing_4",
    userId: "owner_1",
    status: "active",
    paymentDeadline: new Date(Date.now() - 60 * 60 * 1000),
  });

  const expiredResult = await invokeController(
    listingController.transitionListingToPendingPayment,
    {
      params: { id: "listing_4" },
      user: { id: "owner_1" },
    }
  );

  assert.equal(expiredResult.error.statusCode, 400);
  assert.equal(
    expiredResult.error.message,
    "Only listings still within the payment window can be transitioned to pending payment."
  );
});

test("listing responses rebuild the legacy location object from flat columns", async () => {
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async () => [
    {
      id: "listing_5",
      province: "Bulawayo",
      city: "Suburbs",
      addressLine: "22 Main Street",
      address: "22 Main Street, Bulawayo",
      phoneNumber: "+263771234567",
      status: "active",
    },
  ];

  const result = await invokeController(listingController.getListings, {
    query: {},
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.data[0].location, {
    province: "Bulawayo",
    city: "Suburbs",
    addressLine: "22 Main Street",
    country: "Zimbabwe",
  });
  assert.equal(result.body.data[0].province, "Bulawayo");
  assertPublicContactFieldsAbsent(result.body.data[0]);
});

test("getHomeHighlighted strips landlord contact fields from public listing cards", async () => {
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async () => [
    {
      id: "listing_home_highlighted",
      status: "active",
      address: "7 Borrowdale Road",
      phoneNumber: "+263772345678",
    },
  ];

  const result = await invokeController(listingController.getHomeHighlighted, {
    query: {},
  });

  assert.equal(result.statusCode, 200);
  assertPublicContactFieldsAbsent(result.body.data[0]);
});

test("getHomeGroupedByLocation strips landlord contact fields from public grouped listings", async () => {
  prisma.listing.updateMany = async () => ({ count: 0 });
  prisma.listing.findMany = async () => [
    {
      id: "listing_grouped",
      name: "Grouped listing",
      province: "Harare",
      imageUrls: ["grouped.jpg"],
      createdAt: new Date("2025-01-02T00:00:00.000Z"),
      status: "active",
      address: "9 Samora Machel Avenue",
      phoneNumber: "+263773456789",
    },
  ];

  const result = await invokeController(listingController.getHomeGroupedByLocation, {
    query: {},
  });

  assert.equal(result.statusCode, 200);
  assertPublicContactFieldsAbsent(result.body.data[0].listings[0]);
});
