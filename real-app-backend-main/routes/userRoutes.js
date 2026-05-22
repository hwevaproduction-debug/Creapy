const express = require("express");
// Custom Imports
const authController = require("../controllers/authController");

const router = express.Router();

// PUBLIC ROUTES (No authentication required)
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/google", authController.google); // ← Move this HERE, before protect middleware
router.get("/verify-email", authController.verifyEmail);
router.post("/verify-phone", authController.verifyPhone);
router.post("/resend-phone-otp", authController.resendPhoneOtp);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/resend-verification", authController.resendVerification);
router.get("/me", authController.protect, authController.getMe);
router.get("/:id", authController.optionalAuth, authController.getUserByListingId);

// PROTECTED ROUTES (Authentication required for all routes below this point)
router.use(authController.protect);

// USER CONTROLLER
router.post(
  "/submit-verification",
  authController.requireRole("landlord"),
  authController.submitVerification
);
router.put("/update/:id", authController.update);
router.delete("/delete/:id", authController.delete);

module.exports = router;
