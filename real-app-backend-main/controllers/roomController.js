const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");

const AVAILABILITY_BOOKING_STATUSES = ["CONFIRMED", "PENDING_CONFIRMATION", "PENDING_PAYMENT"];
const ROOM_STATUSES = new Set(["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"]);
const BOOKING_MODES = new Set(["INSTANT", "REQUEST"]);

const parseRequiredDate = (value, label) => {
  const parsed = new Date(value);

  if (!value || Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return parsed;
};

const getUserId = (user) => user?.id || user?._id?.toString();

const normalizeEnumInput = (value) => {
  if (value == null || value === "") {
    return null;
  }

  return String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
};

const mapId = (record) => {
  if (!record) {
    return record;
  }

  record._id = record.id;
  return record;
};

const ensureProviderOwnsRoom = async (roomId, userId) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      accommodation: {
        select: { ownerId: true },
      },
    },
  });

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  const ownerId = room.accommodation?.ownerId || room.providerId;

  if (ownerId !== userId.toString()) {
    throw new AppError("You do not own this room", 403);
  }

  return room;
};

exports.createRoom = catchAsync(async (req, res, next) => {
  if (normalizeEnumInput(req.user?.providerProfile?.verificationStatus) !== "APPROVED") {
    return next(new AppError("Provider verification required", 403));
  }

  const input = { ...req.body };
  delete input.provider;
  delete input.providerProfile;
  delete input.providerId;
  delete input._id;
  delete input.id;

  const accommodationId = input.accommodationId;
  if (!accommodationId) {
    return next(new AppError("accommodationId is required", 400));
  }

  const accommodation = await prisma.accommodation.findFirst({
    where: {
      id: accommodationId,
      ownerId: getUserId(req.user),
      deletedAt: null,
    },
  });

  if (!accommodation) {
    return next(new AppError("You do not own this accommodation", 403));
  }

  const status = normalizeEnumInput(input.status) || "AVAILABLE";
  const bookingMode = normalizeEnumInput(input.bookingMode) || "INSTANT";

  if (!ROOM_STATUSES.has(status)) {
    return next(new AppError("Invalid room status", 400));
  }

  if (!BOOKING_MODES.has(bookingMode)) {
    return next(new AppError("Invalid bookingMode", 400));
  }

  const room = await prisma.room.create({
    data: {
      name: input.name,
      description: input.description,
      roomType: input.roomType,
      capacity: input.capacity,
      basePricePerNight: input.basePricePerNight,
      status,
      bookingMode,
      maxAdvanceBookingDays: input.maxAdvanceBookingDays,
      accommodationId,
      providerId: getUserId(req.user),
    },
  });

  mapId(room);

  res.status(201).json({
    status: "success",
    data: {
      room,
    },
  });
});

exports.getMyRooms = catchAsync(async (req, res) => {
  const rooms = await prisma.room.findMany({
    where: { providerId: getUserId(req.user), deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  rooms.forEach(mapId);

  res.status(200).json({
    status: "success",
    results: rooms.length,
    data: {
      rooms,
    },
  });
});

exports.updateRoom = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const updates = { ...req.body };
  delete updates.provider;
  delete updates.providerProfile;
  delete updates.providerId;
  delete updates.accommodationId;
  delete updates.amenities;
  delete updates.imageUrls;
  delete updates.pricingRules;
  delete updates.cancellationPolicy;
  delete updates.cancellationPolicyCustomText;
  delete updates._id;
  delete updates.id;

  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    updates.status = normalizeEnumInput(updates.status);

    if (!ROOM_STATUSES.has(updates.status)) {
      return next(new AppError("Invalid room status", 400));
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, "bookingMode")) {
    updates.bookingMode = normalizeEnumInput(updates.bookingMode);

    if (!BOOKING_MODES.has(updates.bookingMode)) {
      return next(new AppError("Invalid bookingMode", 400));
    }
  }

  const room = await prisma.room.update({
    where: { id: req.params.id },
    data: updates,
  });

  mapId(room);

  res.status(200).json({
    status: "success",
    data: {
      room,
    },
  });
});

exports.deleteRoom = catchAsync(async (req, res) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  await prisma.room.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.createRoomBlock = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const startDate = parseRequiredDate(req.body.startDate, "startDate");
  const endDate = parseRequiredDate(req.body.endDate, "endDate");

  if (startDate >= endDate) {
    return next(new AppError("startDate must be before endDate", 400));
  }

  const availabilityBlock = await prisma.availabilityBlock.create({
    data: {
      roomId: req.params.id,
      blockType: "MANUAL",
      startDate,
      endDate,
      reason: req.body.reason || "",
      createdBy: getUserId(req.user),
    },
  });

  mapId(availabilityBlock);

  res.status(201).json({
    status: "success",
    data: {
      availabilityBlock,
    },
  });
});

exports.deleteRoomBlock = catchAsync(async (req, res, next) => {
  await ensureProviderOwnsRoom(req.params.id, getUserId(req.user));

  const availabilityBlock = await prisma.availabilityBlock.findFirst({
    where: {
      id: req.params.blockId,
      roomId: req.params.id,
    },
  });

  if (!availabilityBlock) {
    return next(new AppError("Availability block not found", 404));
  }

  await prisma.availabilityBlock.delete({
    where: { id: req.params.blockId },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.getRoomAvailability = catchAsync(async (req, res, next) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });

  if (!room) {
    return next(new AppError("Room not found", 404));
  }

  const from = parseRequiredDate(req.query.checkIn || req.query.from, "checkIn");
  const to = parseRequiredDate(req.query.checkOut || req.query.to, "checkOut");

  if (from >= to) {
    return next(new AppError("from must be before to", 400));
  }

  const [bookings, availabilityBlocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        roomId: req.params.id,
        status: { in: AVAILABILITY_BOOKING_STATUSES },
        checkIn: { lt: to },
        checkOut: { gt: from },
      },
      select: { checkIn: true, checkOut: true },
      orderBy: { checkIn: "asc" },
    }),
    prisma.availabilityBlock.findMany({
      where: {
        roomId: req.params.id,
        startDate: { lt: to },
        endDate: { gt: from },
      },
      select: { startDate: true, endDate: true, reason: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      bookedRanges: bookings.map((booking) => ({
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
      })),
      blockedRanges: availabilityBlocks.map((availabilityBlock) => ({
        startDate: availabilityBlock.startDate,
        endDate: availabilityBlock.endDate,
        reason: availabilityBlock.reason || "",
      })),
    },
  });
});
