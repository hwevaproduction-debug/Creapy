const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const bcrypt = require("bcryptjs");
// Custom Imports
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../utils/prisma");
const { comparePassword } = require("../utils/auth");
const { isPremiumTenant } = require("../utils/monetization");
const { sendEmail } = require("../utils/email");
const { sendSms } = require("../utils/sms");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const hashVerificationToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createEmailVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    hashedToken: hashVerificationToken(rawToken),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
};

const buildVerificationDeliveryError = (channel, error) => {
  const providerDetail =
    typeof error?.message === "string" && error.message.trim()
      ? ` Provider response: ${error.message.trim()}`
      : "";

  if (channel === "sms") {
    return new AppError(
      `We couldn't send the phone verification code. Please try signing up again.${providerDetail}`,
      503
    );
  }

  return new AppError(
    `We couldn't send the verification email. Please try signing up again.${providerDetail}`,
    503
  );
};

const generatePhoneOtp = () => {
  const rawOtp = String(Math.floor(100000 + Math.random() * 900000));
  const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");

  return {
    rawOtp,
    hashedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
};

const phoneOtpResendAttempts = new Map();

const getAppBaseUrl = () => {
  const configuredBaseUrl =
    process.env.APP_BASE_URL || process.env.FRONTEND_URL || "http://localhost:3000";

  return configuredBaseUrl.replace(/\/+$/, "");
};

const sendVerificationEmail = async (user, rawToken) => {
  const verificationUrl = `${getAppBaseUrl()}/verify-email?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your Creapy email",
    text: `Welcome to Creapy. Verify your email by opening this link: ${verificationUrl}`,
    html: `
      <p>Welcome to Creapy.</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

const buildPublicUserPayload = (user, { includeContactDetails = false } = {}) => {
  const source = user;
  const payload = {
    _id: source.id,
    username: source.username,
    avatar: source.avatar,
    role: source.role,
  };

  if (includeContactDetails) {
    payload.email = source.email;
    payload.phoneNumber = source.phoneNumber || null;
  }

  return payload;
};

const buildAuthUserPayload = (user) => ({
  _id: user.id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  phoneNumber: user.phoneNumber || null,
  isEmailVerified: Boolean(user.isEmailVerified),
  isPhoneVerified: Boolean(user.isPhoneVerified),
  verificationStatus: user.verificationStatus || "UNVERIFIED",
  premiumExpiry: user.premiumExpiry || null,
  createdAt: user.createdAt || null,
  updatedAt: user.updatedAt || null,
});

const buildPendingVerificationUserPayload = (user) => ({
  ...buildPublicUserPayload(user, { includeContactDetails: true }),
  isEmailVerified: Boolean(user.isEmailVerified),
  isPhoneVerified: Boolean(user.isPhoneVerified),
});

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  const { password, ...sanitizedUser } = user;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user: buildAuthUserPayload(sanitizedUser),
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { username, email, password, role } = req.body;
  const allowedRoles = ["tenant", "landlord"];

  if (role && !allowedRoles.includes(role)) {
    return next(new AppError("Invalid role. Role must be tenant or landlord", 400));
  }

  const verification = createEmailVerificationToken();
  const newUser = await prisma.user.create({
    data: {
      username,
      email,
      password: await bcrypt.hash(password, 12),
      ...(role ? { role } : {}),
      isEmailVerified: false,
      emailVerificationToken: verification.hashedToken,
      emailVerificationExpires: new Date(verification.expiresAt),
    },
  });

  if (process.env.SKIP_EMAIL_VERIFICATION === "true") {
    const verifiedUser = await prisma.user.update({
      where: { id: newUser.id },
      data: { isEmailVerified: true },
    });
    createSendToken(verifiedUser, 201, res);
    return;
  }

  try {
    await sendVerificationEmail(newUser, verification.rawToken);
  } catch (error) {
    await prisma.user.delete({ where: { id: newUser.id } });
    return next(buildVerificationDeliveryError("email", error));
  }

  newUser.password = undefined;

  res.status(201).json({
    status: "pending_verification",
    message: "Account created. Please check your email to verify your account.",
    data: {
      user: buildPendingVerificationUserPayload(newUser),
    },
  });
});


exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // 2) Check if user exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return next(new AppError("User not found", 404));

  // 3) Check if password is correct
  const correct = await comparePassword(password, user.password);
  if (!correct) {
    return next(new AppError("Incorrect password", 401));
  }

  if (user.isEmailVerified !== true) {
    return next(new AppError("Please verify your email before logging in", 403));
  }

  // 4) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const rawToken = req.query.token;

  if (!rawToken) {
    return next(new AppError("Verification token is required", 400));
  }

  const hashedToken = hashVerificationToken(rawToken.toString());

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return next(new AppError("Verification link is invalid or has expired", 400));
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  createSendToken(verifiedUser, 200, res);
});

exports.getUserByListingId = catchAsync(async (req, res, next) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
  });
  if (!listing) {
    return next(new AppError("No listing found with that ID", 404));
  }

  const user = await prisma.user.findUnique({
    where: { id: listing.userId },
  });
  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: buildPublicUserPayload(user, {
      includeContactDetails: Boolean(req.user),
    }),
  });
});

exports.update = catchAsync(async (req, res, next) => {
  const { username, email, password, avatar } = req.body.payload;

  // 1) Check if user exists
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  const data = {
    username,
    email,
    avatar,
  };

  if (password && typeof password === "string" && password.length > 0) {
    const hashedPassword = await bcrypt.hash(password, 12);
    data.password = hashedPassword;
  }

  // 3) Update user
  const newUser = await prisma.user.update({
    where: { id: req.params.id },
    data,
  });

  // 4) If everything ok, send token to client
  createSendToken(newUser, 200, res);
});

exports.getMe = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Not authenticated", 401));
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user: buildAuthUserPayload(user),
    },
  });
});

exports.delete = catchAsync(async (req, res, next) => {
  // 1) Find User
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }
  // 2) Delete User
  await prisma.user.delete({ where: { id: req.params.id } });

  // 3) If everything ok, send token to client
  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.google = catchAsync(async (req, res, next) => {
  const { name, email, photo } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    let currentUser = user;
    if (user.isEmailVerified !== true || user.isPhoneVerified !== true) {
      currentUser = await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true, isPhoneVerified: true },
      });
    }
    // just return the user
    createSendToken(currentUser, 200, res);
  } else {
    const newUser = await prisma.user.create({
      data: {
        username: name,
        email,
        password: await bcrypt.hash(Math.random().toString(), 12),
        avatar: photo,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });

    createSendToken(newUser, 201, res);
  }
});

exports.verifyPhone = catchAsync(async (req, res, next) => {
  const { otp, email } = req.body;

  if (!otp) {
    return next(new AppError("OTP is required", 400));
  }

  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  if (!/^\d{6}$/.test(otp)) {
    return next(new AppError("OTP must be a 6-digit number", 400));
  }

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      email,
      role: "landlord",
      isEmailVerified: true,
      isPhoneVerified: false,
      phoneOtp: hashedOtp,
      phoneOtpExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return next(new AppError("OTP is invalid or has expired", 400));
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isPhoneVerified: true,
      phoneOtp: null,
      phoneOtpExpires: null,
    },
  });

  phoneOtpResendAttempts.delete(user.id);

  createSendToken(updatedUser, 200, res);
});

exports.resendPhoneOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (user.role !== "landlord" || user.isPhoneVerified === true) {
    return next(new AppError("Phone OTP is only available for unverified landlords", 400));
  }

  if (!user.phoneNumber) {
    return next(new AppError("No phone number on record for this account", 400));
  }

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const existingOtpIssuedAt = user.phoneOtpExpires
    ? user.phoneOtpExpires.getTime() - 10 * 60 * 1000
    : null;

  let resendWindow = phoneOtpResendAttempts.get(user.id);

  if (
    !resendWindow &&
    existingOtpIssuedAt &&
    existingOtpIssuedAt > oneHourAgo
  ) {
    resendWindow = {
      count: 0,
      windowStart: existingOtpIssuedAt,
    };
  }

  if (!resendWindow || resendWindow.windowStart <= oneHourAgo) {
    resendWindow = {
      count: 0,
      windowStart: now,
    };
  }

  if (resendWindow.count >= 3) {
    return next(new AppError("Too many OTP resend requests. Please try again later.", 429));
  }

  const phoneVerification = generatePhoneOtp();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phoneOtp: phoneVerification.hashedOtp,
      phoneOtpExpires: new Date(phoneVerification.expiresAt),
    },
  });

  await sendSms({
    to: user.phoneNumber,
    message: `Your Creapy verification code is ${phoneVerification.rawOtp}. It expires in 10 minutes.`,
  });

  phoneOtpResendAttempts.set(user.id, {
    count: resendWindow.count + 1,
    windowStart: resendWindow.windowStart,
  });

  res.status(200).json({
    status: "success",
    message: "OTP resent.",
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError("Email is required", 400));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(200).json({
      status: "success",
      message: "If that email exists, a reset link has been sent.",
    });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Town Ruins password",
    text: `Reset your password by visiting: ${resetUrl}\nThis link expires in 1 hour.`,
    html: `<p>Hello ${user.username},</p><p>Click the link below to reset your Town Ruins password:</p><p><a href="${resetUrl}" style="background:#B8975A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Reset Password</a></p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
  });

  res.status(200).json({
    status: "success",
    message: "If that email exists, a reset link has been sent.",
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return next(new AppError("Token and new password are required", 400));
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) return next(new AppError("Reset link is invalid or has expired", 400));

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, 12),
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  res
    .status(200)
    .json({ status: "success", message: "Password updated successfully." });
});

exports.resendVerification = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError("Email is required", 400));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isEmailVerified) {
    return res.status(200).json({
      status: "success",
      message: "If applicable, a new verification email has been sent.",
    });
  }

  const verification = createEmailVerificationToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verification.hashedToken,
      emailVerificationExpires: new Date(verification.expiresAt),
    },
  });

  await sendVerificationEmail(user, verification.rawToken);
  res
    .status(200)
    .json({ status: "success", message: "Verification email resent." });
});

exports.submitVerification = catchAsync(async (req, res, next) => {
  if (req.user?.role !== "landlord") {
    return next(new AppError("Access denied", 403));
  }

  const { idImageUrl, selfieUrl } = req.body;
  if (!idImageUrl || !selfieUrl) {
    return next(new AppError("ID image and selfie are required", 400));
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      verificationStatus: "PENDING_REVIEW",
      verificationIdUrl: idImageUrl,
      verificationSelfieUrl: selfieUrl,
      verificationSubmittedAt: new Date(),
    },
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: "New landlord verification submission",
      text: `User ${req.user.username} (${req.user.email}) has submitted identity verification documents for review.`,
      html: `<p>User <strong>${req.user.username}</strong> (${req.user.email}) has submitted identity verification. Please review in the admin dashboard.</p>`,
    });
  }

  res.status(200).json({
    status: "success",
    message: "Verification submitted. We will review within 24-48 hours.",
  });
});

exports.optionalAuth = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token, just continue without setting req.user
  if (!token) {
    return next();
  }

  try {
    // 2) Verification token
    const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const freshUser = await prisma.user.findUnique({ where: { id: decode.id } });
    if (freshUser) {
      // GRANT ACCESS WITH USER CONTEXT
      req.user = freshUser;
    }
    // If user doesn't exist, silently continue without setting req.user
  } catch (err) {
    // Swallow auth errors and continue without req.user
  }
  next();
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const freshUser = await prisma.user.findUnique({ where: { id: decode.id } });
  if (!freshUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = freshUser;
  next();
});
exports.requireRole = (role) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(role) ? role : [role];

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError("Access denied", 403));
    }
    next();
  };
};

exports.requirePremium = (req, res, next) => {
  if (!req.user || !isPremiumTenant(req.user)) {
    return next(
      new AppError("Premium feature. Please upgrade your account.", 402)
    );
  }
  next();
};
