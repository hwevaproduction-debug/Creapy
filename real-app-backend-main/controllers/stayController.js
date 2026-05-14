const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");
const { resolvePrice } = require("../utils/pricingResolver");

const AVAILABLE_BOOKING_STATUSES = ["CONFIRMED", "PENDING_CONFIRMATION", "PENDING_PAYMENT"];
const ACCOMMODATION_TYPES = new Set([
  "HOTEL",
  "LODGE",
  "BNB",
  "APARTMENT",
  "GUEST_HOUSE",
  "HOSTEL",
]);
const BOOKING_MODES = new Set(["INSTANT", "REQUEST"]);

const parseDate = (value, label) => {
  if (value == null || value === "") {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return parsed;
};

const mapId = (record) => {
  if (!record) {
    return record;
  }

  record._id = record.id;
  return record;
};

const normalizeEnumInput = (value) => {
  if (value == null || value === "") {
    return null;
  }

  return String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
};

const decorateStay = (room, checkIn, checkOut) => {
  const stay = room.toObject ? room.toObject() : room;
  const resolvedPrice =
    checkIn && checkOut
      ? resolvePrice(stay, checkIn, checkOut)
      : stay.basePricePerNight ??
        stay.pricePerNight ??
        stay.nightlyRate ??
        stay.price ??
        null;

  return {
    ...stay,
    resolvedPrice,
  };
};

const AMENITY_LABEL_TO_FLAG = {
  "Wi-Fi": "wifi",
  "Breakfast Included": "breakfast",
  "Secure Parking": "parking",
  "Swimming Pool": "pool",
  "Air Conditioning": "aircon",
  "Conference Room": "conferenceRoom",
  "Airport Pickup": "airportPickup",
  "Family Friendly": "familyFriendly",
};

const matchesAmenityFilters = (room, reqQuery) => {
  const amenityLabels = Array.isArray(reqQuery.amenities)
    ? reqQuery.amenities
    : typeof reqQuery.amenities === "string" && reqQuery.amenities.trim()
      ? [reqQuery.amenities]
      : [];

  const requiredFlags = new Set();

  amenityLabels.forEach((label) => {
    const flag = AMENITY_LABEL_TO_FLAG[label];

    if (flag) {
      requiredFlags.add(flag);
    }
  });

  [
    "wifi",
    "breakfast",
    "parking",
    "pool",
    "aircon",
    "conferenceRoom",
    "airportPickup",
    "familyFriendly",
  ].forEach((flag) => {
    if (reqQuery[flag] === "true") {
      requiredFlags.add(flag);
    }
  });

  return [...requiredFlags].every((flag) =>
    room.amenities?.some((roomAmenity) => roomAmenity?.amenity?.slug === flag)
  );
};

exports.searchStays = catchAsync(async (req, res, next) => {
  const checkIn = parseDate(req.query.checkIn, "checkIn");
  const checkOut = parseDate(req.query.checkOut, "checkOut");
  if ((checkIn && !checkOut) || (!checkIn && checkOut) || (checkIn && checkOut && checkIn >= checkOut)) {
    return next(new AppError("Valid checkIn and checkOut are required together", 400));
  }

  const location = req.query.location?.trim();
  const businessType = normalizeEnumInput(req.query.businessType);
  const bookingMode = normalizeEnumInput(req.query.bookingMode);

  if (businessType && !ACCOMMODATION_TYPES.has(businessType)) {
    return next(new AppError("Invalid businessType", 400));
  }

  if (bookingMode && !BOOKING_MODES.has(bookingMode)) {
    return next(new AppError("Invalid bookingMode", 400));
  }

  const approvedAccommodations = await prisma.accommodation.findMany({
    where: {
      verificationStatus: "APPROVED",
      isPublished: true,
      deletedAt: null,
      ...(businessType ? { type: businessType } : {}),
      ...(location
        ? {
            OR: [
              { province: { contains: location, mode: "insensitive" } },
              { city: { contains: location, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true },
  });

  const approvedAccommodationIds = approvedAccommodations.map(
    (accommodation) => accommodation.id
  );

  let rooms = [];

  if (approvedAccommodationIds.length) {
    const minPrice = Number.parseFloat(req.query.minPrice);
    const maxPrice = Number.parseFloat(req.query.maxPrice);
    const basePricePerNight = {};

    if (Number.isFinite(minPrice)) {
      basePricePerNight.gte = minPrice;
    }

    if (Number.isFinite(maxPrice)) {
      basePricePerNight.lte = maxPrice;
    }

    rooms = await prisma.room.findMany({
      where: {
        accommodationId: { in: approvedAccommodationIds },
        status: "AVAILABLE",
        deletedAt: null,
        ...(req.query.guests ? { capacity: { gte: Number(req.query.guests) } } : {}),
        ...(Object.keys(basePricePerNight).length ? { basePricePerNight } : {}),
        ...(bookingMode ? { bookingMode } : {}),
      },
      include: {
        accommodation: true,
        amenities: {
          include: { amenity: true },
        },
        images: { orderBy: { sortOrder: "asc" } },
        seasonalRates: true,
      },
    });

    rooms = rooms.filter((room) => matchesAmenityFilters(room, req.query));
  }

  if (checkIn && checkOut && rooms.length) {
    const roomIds = rooms.map((room) => room.id);

    const [bookings, availabilityBlocks] = await Promise.all([
      prisma.booking.findMany({
        where: {
          roomId: { in: roomIds },
          status: { in: AVAILABLE_BOOKING_STATUSES },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      }),
      prisma.availabilityBlock.findMany({
        where: {
          roomId: { in: roomIds },
          startDate: { lt: checkOut },
          endDate: { gt: checkIn },
        },
      }),
    ]);

    const unavailableRoomIds = new Set([
      ...bookings.map((booking) => booking.roomId),
      ...availabilityBlocks.map((availabilityBlock) => availabilityBlock.roomId),
    ]);

    rooms = rooms.filter((room) => !unavailableRoomIds.has(room.id));
  }

  rooms.forEach((room) => {
    mapId(room);
    mapId(room.accommodation);
  });

  const stays = rooms.map((room) => decorateStay(room, checkIn, checkOut));

  res.status(200).json({
    status: "success",
    results: stays.length,
    data: {
      stays,
    },
  });
});

exports.getProviderStays = catchAsync(async (req, res, next) => {
  const providerId = req.params.providerId;

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true, providerProfile: true },
  });

  if (!provider) {
    return next(new AppError("Provider not approved", 404));
  }

  const accommodations = await prisma.accommodation.findMany({
    where: {
      ownerId: providerId,
      verificationStatus: "APPROVED",
      isPublished: true,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!accommodations.length) {
    return next(new AppError("Provider not approved", 404));
  }

  mapId(provider);
  accommodations.forEach(mapId);

  const rooms = await prisma.room.findMany({
    where: {
      accommodationId: { in: accommodations.map((accommodation) => accommodation.id) },
      status: "AVAILABLE",
      deletedAt: null,
    },
    include: {
      accommodation: true,
      amenities: {
        include: { amenity: true },
      },
      images: { orderBy: { sortOrder: "asc" } },
      seasonalRates: true,
    },
    orderBy: { createdAt: "desc" },
  });

  rooms.forEach((room) => {
    mapId(room);
    mapId(room.accommodation);
  });

  const decoratedRooms = rooms.map((room) => decorateStay(room));

  res.status(200).json({
    status: "success",
    data: {
      provider: {
        ...provider.providerProfile,
        _id: provider.id,
        accommodation: accommodations[0],
        accommodations,
      },
      rooms: decoratedRooms,
    },
  });
});
