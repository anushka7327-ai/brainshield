const Threat = require("../models/Threat");

// GET /api/threat
const getThreats = async (req, res) => {
  try {
    const filter = req.query.brand ? { brandKey: String(req.query.brand).toLowerCase() } : {};
    const threats = await Threat.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: threats.length,
      data: threats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/threat/:id
const getThreatById = async (req, res) => {
  try {
    const threat = await Threat.findById(req.params.id);

    if (!threat) {
      return res.status(404).json({
        success: false,
        message: "Threat not found",
      });
    }

    res.status(200).json({
      success: true,
      data: threat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getThreats,
  getThreatById,
};