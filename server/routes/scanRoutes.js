const express = require("express");
const requireDb = require("../middleware/requireDb");

const {
  getSocialScan,
  getAppScan,
  createScan,
  runScan,
} = require("../controllers/scanController");

const router = express.Router();

// Get social scans
router.get("/social", requireDb, getSocialScan);

// Get app scans
router.get("/apps", requireDb, getAppScan);

// Create new scan record
router.post("/", requireDb, createScan);

// Run a live scan (Google Play + social accounts) and save the results
router.post("/run", runScan);

module.exports = router;