const Threat = require("../models/Threat");

const getDashboard = async (req, res) => {
  try {
    const filter = req.query.brand ? { brandKey: String(req.query.brand).toLowerCase() } : {};
    const threats = await Threat.find(filter);

    const totalThreats = threats.length;

    const highRisk = threats.filter(
      (threat) => threat.risk === "High"
    ).length;

    const socialThreats = threats.filter(
      (threat) =>
        threat.platform === "Instagram" ||
        threat.platform === "Facebook" ||
        threat.platform === "X"
    ).length;

    const suspiciousApps = threats.filter(
      (threat) =>
        threat.platform === "Play Store" ||
        threat.platform === "App Store"
    ).length;

    const platformMap = {};

    threats.forEach((threat) => {
      platformMap[threat.platform] =
        (platformMap[threat.platform] || 0) + 1;
    });

    const threatsByPlatform = Object.keys(platformMap).map(
      (platform) => ({
        platform,
        count: platformMap[platform],
      })
    );

    const riskMap = {
      High: 0,
      Medium: 0,
      Low: 0,
    };

    threats.forEach((threat) => {
      if (riskMap[threat.risk] !== undefined) {
        riskMap[threat.risk]++;
      }
    });

    const threatLevels = [
      {
        level: "High",
        count: riskMap.High,
      },
      {
        level: "Medium",
        count: riskMap.Medium,
      },
      {
        level: "Low",
        count: riskMap.Low,
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        totalThreats,
        highRisk,
        socialThreats,
        suspiciousApps,
        threatsByPlatform,
        threatLevels,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getDashboard,
};