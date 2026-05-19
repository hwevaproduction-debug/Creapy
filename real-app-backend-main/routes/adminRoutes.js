const express = require("express");
const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const reviewController = require("../controllers/reviewController");

const router = express.Router();

router.use(
  authController.protect,
  authController.requireRole(["admin", "super_admin"])
);

router.get("/queue", adminController.getModerationQueue);

router.get(
  "/listings/inactive",
  adminController.getInactiveListings
);
router.post(
  "/listings/bulk-revive",
  adminController.bulkReviveListings
);

router.get("/accommodations", adminController.getAccommodations);
router.put("/accommodations/:id/approve", adminController.approveAccommodation);
router.put("/accommodations/:id/reject", adminController.rejectAccommodation);
router.put("/accommodations/:id/suspend", adminController.suspendAccommodation);
router.put("/accommodations/:id/reinstate", adminController.reinstateAccommodation);

router.get("/reviews", reviewController.getAllReviews);
router.get("/reviews/analytics", reviewController.getReviewAnalytics);
router.put("/reviews/:id/moderate", reviewController.moderateReview);

router.put("/providers/:id/suspend", adminController.suspendProvider);
router.put("/providers/:id/reinstate", adminController.reinstateProvider);

router.get("/disputes", adminController.getDisputes);
router.get("/disputes/:id", adminController.getDisputeById);
router.post("/disputes/:id/review", adminController.markDisputeUnderReview);
router.post("/disputes/:id/resolve", adminController.resolveDispute);
router.post("/disputes/:id/close", adminController.closeDispute);

router.get("/reports", adminController.getReports);
router.get("/reports/:id", adminController.getReportById);
router.put("/reports/:id/review", adminController.markReportUnderReview);
router.put("/reports/:id/resolve", adminController.resolveReport);
router.put("/reports/:id/dismiss", adminController.dismissReport);

router.get("/audit-logs", adminController.getAuditLogs);
router.get("/audit-logs/:id", adminController.getAuditLogById);

module.exports = router;
