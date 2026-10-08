const express = require("express");
const { getQueue } = require("../controllers/queueController");

const router = express.Router();
router.get("/:brandKey", getQueue);

module.exports = router;
