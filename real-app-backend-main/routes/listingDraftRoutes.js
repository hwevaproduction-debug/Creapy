const express = require("express");
const authController = require("../controllers/authController");
const listingDraftController = require("../controllers/listingDraftController");
const AppError = require("../utils/appError");
const validate = require("../middleware/validate");
const {
  createListingDraftValidators,
  updateListingDraftValidators,
} = require("../middleware/listingDraftValidators");

const router = express.Router();
const requireListingDraftRole = (req, res, next) => {
  if (!req.user || !["landlord", "provider"].includes(req.user.role)) {
    return next(new AppError("Access denied", 403));
  }
  next();
};

router.use(authController.protect);
router.use(requireListingDraftRole);

router.post(
  "/",
  ...createListingDraftValidators,
  validate,
  listingDraftController.createListingDraft
);

router.get("/", listingDraftController.getMyListingDrafts);
router.get("/mine", listingDraftController.getMyListingDrafts);
router.get("/:id", listingDraftController.getListingDraft);

router.put(
  "/:id",
  ...updateListingDraftValidators,
  validate,
  listingDraftController.updateListingDraft
);
router.patch(
  "/:id",
  ...updateListingDraftValidators,
  validate,
  listingDraftController.updateListingDraft
);

router.delete("/:id", listingDraftController.deleteListingDraft);

module.exports = router;

