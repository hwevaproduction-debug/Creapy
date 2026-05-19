const express = require("express");
const authController = require("../controllers/authController");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.use(authController.protect);

router.get("/", notificationController.getMyNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.put("/read-all", notificationController.markAllAsRead);
router.put("/:id/read", notificationController.markAsRead);

module.exports = router;
