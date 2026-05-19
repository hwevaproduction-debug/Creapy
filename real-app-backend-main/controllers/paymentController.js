const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");
const { getProvider, getProviderByName } = require("../utils/paymentProvider");

const getUserId = (user) => user?.id || user?._id?.toString();

const getPaymentMethod = () => String(process.env.PAYMENT_PROVIDER || "mock").trim().toLowerCase();

const mapId = (record) => {
  if (!record) {
    return record;
  }

  record._id = record.id;
  return record;
};

const getPaymentProvider = (payment) => getProviderByName(payment?.method);

exports.initiateListingFee = catchAsync(async (req, res, next) => {
  const { listingId, phone } = req.body;

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  if (listing.userId !== getUserId(req.user).toString()) {
    return next(new AppError("Forbidden", 403));
  }

  if (!["pending_payment", "inactive", "active"].includes(listing.status)) {
    return next(new AppError("Listing is not awaiting payment", 400));
  }

  listing._id = listing.id;

  const provider = getProvider();
  const result = await provider.initiateListingFee(listing, {
    ...req.user,
    _id: getUserId(req.user),
    phone,
  });

  await prisma.payment.create({
    data: {
      type: "listing_fee",
      listingId: listing.id,
      userId: getUserId(req.user),
      transactionRef: result.transactionRef,
      status: "pending",
      method: getPaymentMethod(),
      amount: parseFloat(process.env.LISTING_FEE_AMOUNT) || 0,
    },
  });

  await prisma.listing.update({
    where: { id: listing.id },
    data: { status: "pending_payment" },
  });

  res.status(201).json({
    status: "success",
    data: {
      transactionRef: result.transactionRef,
      instructions: result.instructions,
    },
  });
});

exports.initiateTenantPremium = catchAsync(async (req, res) => {
  const { phone } = req.body;

  const provider = getProvider();
  const result = await provider.initiatePremiumSubscription({
    ...req.user,
    _id: getUserId(req.user),
    phone,
  });

  await prisma.payment.create({
    data: {
      type: "premium_subscription",
      userId: getUserId(req.user),
      transactionRef: result.transactionRef,
      status: "pending",
      method: getPaymentMethod(),
      amount: parseFloat(process.env.TENANT_PREMIUM_AMOUNT) || 0,
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      transactionRef: result.transactionRef,
      instructions: result.instructions,
    },
  });
});

exports.getMyPayments = catchAsync(async (req, res) => {
  const payments = await prisma.payment.findMany({
    where: { userId: getUserId(req.user) },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  payments.forEach((payment) => {
    mapId(payment);
    mapId(payment.listing);
  });

  res.status(200).json({
    status: "success",
    results: payments.length,
    data: payments,
  });
});

exports.retryPayment = catchAsync(async (req, res, next) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
  });

  if (!payment) {
    return next(new AppError("Payment not found", 404));
  }

  if (payment.userId !== getUserId(req.user)) {
    return next(new AppError("Forbidden", 403));
  }

  if (!["failed", "pending"].includes(payment.status)) {
    return next(new AppError("Payment cannot be retried", 400));
  }

  const maxRetries = Number.parseInt(process.env.MAX_PAYMENT_RETRIES, 10) || 3;

  if (payment.retryCount >= maxRetries) {
    return next(new AppError("Payment retry limit reached", 400));
  }

  const cooldownMinutes = Number.parseInt(process.env.RETRY_COOLDOWN_MINUTES, 10) || 5;
  const cooldownMs = cooldownMinutes * 60 * 1000;

  if (payment.lastRetryAt && Date.now() - new Date(payment.lastRetryAt).getTime() < cooldownMs) {
    return next(new AppError("Payment retry cooldown is still active", 429));
  }

  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: { id: true, email: true, phoneNumber: true },
  });

  if (!user) {
    return next(new AppError("Payment user not found", 404));
  }

  const provider = getPaymentProvider(payment);
  const result = await provider.retryPayment(payment, {
    ...user,
    _id: payment.userId,
    phone: req.body.phone || user.phoneNumber,
  });
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      transactionRef: result.transactionRef,
      providerIntentId: result.providerIntentId || payment.providerIntentId || null,
      providerMeta: result.providerMeta || payment.providerMeta || null,
      retryCount: payment.retryCount + 1,
      lastRetryAt: new Date(),
      status: "pending",
      webhookVerified: false,
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      transactionRef: updatedPayment.transactionRef,
      instructions: result.instructions,
      paymentId: updatedPayment.id,
    },
  });
});

exports.getPaymentStatus = catchAsync(async (req, res, next) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
  });

  if (!payment) {
    return next(new AppError("Payment not found", 404));
  }

  if (payment.userId !== getUserId(req.user)) {
    return next(new AppError("Forbidden", 403));
  }

  const provider = getPaymentProvider(payment);
  const liveStatus = await provider.pollPaymentStatus(payment);

  res.status(200).json({
    status: "success",
    data: {
      status: liveStatus.status,
      amountPaid: payment.amountPaid,
      amountDue: payment.amountDue,
      retryCount: payment.retryCount,
    },
  });
});
