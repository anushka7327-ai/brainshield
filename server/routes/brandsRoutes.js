const express = require("express");
const c = require("../controllers/brandsController");

const router = express.Router();

router.get("/", c.listBrands);
router.post("/resolve", c.resolveBrand);
router.get("/:brandKey", c.getBrandProfile);
router.patch("/:brandKey", c.updateBrandProfile);

module.exports = router;
