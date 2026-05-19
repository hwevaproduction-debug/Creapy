const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");

const getUserId = (user) => user?.id || user?._id?.toString();

const getPagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

exports.getMyNotifications = catchAsync(async (req, res) => {
  const userId = getUserId(req.user);
  const { limit, skip } = getPagination(req.query);
  const where = { userId };
  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  res.status(200).json({
    status: "success",
    total,
    data: notifications,
  });
});

exports.getUnreadCount = catchAsync(async (req, res) => {
  const count = await prisma.notification.count({
    where: {
      userId: getUserId(req.user),
      isRead: false,
    },
  });

  res.status(200).json({
    status: "success",
    data: { count },
  });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
  const result = await prisma.notification.updateMany({
    where: {
      id: req.params.id,
      userId: getUserId(req.user),
    },
    data: { isRead: true },
  });

  if (result.count === 0) {
    return next(new AppError("Notification not found", 404));
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: req.params.id,
      userId: getUserId(req.user),
    },
  });

  res.status(200).json({
    status: "success",
    data: notification,
  });
});

exports.markAllAsRead = catchAsync(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId: getUserId(req.user),
      isRead: false,
    },
    data: { isRead: true },
  });

  res.status(200).json({
    status: "success",
    data: { updated: result.count },
  });
});
