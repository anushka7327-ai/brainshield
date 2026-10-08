const brandStore = require("../services/brandStore");
const scanService = require("../services/scanService");
const { publicProfile } = require("../services/brandEngine");

// GET /api/threats/:brandKey
// Look-alike candidates generated for the brand, merged with anything found by saved scans.
const getQueue = async (req, res) => {
  try {
    const profile = await brandStore.get(req.params.brandKey);
    if (!profile) return res.status(400).json({ success: false, message: "Invalid brand." });

    const { threats, summary } = await scanService.buildQueue(profile);
    res.json({
      success: true,
      brandKey: profile.key,
      profile: publicProfile(profile),
      totalThreats: threats.length,
      summary,
      threats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getQueue };
