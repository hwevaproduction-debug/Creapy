const express = require("express");
const pricingController = require("../controllers/pricingController");

const router = express.Router();

router.post("/quote", pricingController.getPricingQuote);
router.post("/validate-coupon", pricingController.validateCoupon);

module.exports = router;
