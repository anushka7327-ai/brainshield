const Brand = require("../models/Brand");
const brandStore = require("../services/brandStore");

// GET /api/brand
const getBrand = async (req, res) => {
  try {
    const brand = await Brand.findOne().sort({ createdAt: -1 });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: brand,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/brand
const createBrand = async (req, res) => {
  try {
    const {
      brandName,
      website,
      logo,
      instagram,
      facebook,
      x,
      linkedin,
      officialAppName,
      developerName,
      keywords,
    } = req.body;

    if (!brandName) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const brand = await Brand.create({
      brandName,
      website,
      logo,
      instagram,
      facebook,
      x,
      linkedin,
      officialAppName,
      developerName,
      keywords,
    });

    brandStore.syncFromDoc(brand);

    res.status(201).json({
      success: true,
      message: "Brand profile created successfully",
      data: brand,
    });
  } catch (error) {
    // Same brand name saved twice (slug is unique)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A profile for this brand already exists. Update it instead.",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PUT /api/brand/:id
const updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand profile not found",
      });
    }

    brandStore.syncFromDoc(brand);

    res.status(200).json({
      success: true,
      message: "Brand profile updated successfully",
      data: brand,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getBrand,
  createBrand,
  updateBrand,
};