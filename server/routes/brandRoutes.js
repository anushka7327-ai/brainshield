const express = require("express");

const {
  createBrand,
  getBrand,
  updateBrand,
} = require("../controllers/brandController");

const router = express.Router();

router.post("/", createBrand);
router.get("/", getBrand);
router.put("/:id", updateBrand);

module.exports = router;