const express = require("express");

const {
  getThreats,
  getThreatById,
} = require("../controllers/threatController");

const router = express.Router();

router.get("/", getThreats);
router.get("/:id", getThreatById);

module.exports = router;