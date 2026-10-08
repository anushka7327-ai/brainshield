const Scan = require("../models/Scan");
const brandStore = require("../services/brandStore");
const scanService = require("../services/scanService");

// Get Social Scan
const getSocialScan = async (req, res) => {
  try {
    const scans = await Scan.find({
      scanType: "Social",
      ...(req.query.brand ? { brandKey: String(req.query.brand).toLowerCase() } : {}),
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: scans.length,
      data: scans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get App Scan
const getAppScan = async (req, res) => {
  try {
    const scans = await Scan.find({
      scanType: "App",
      ...(req.query.brand ? { brandKey: String(req.query.brand).toLowerCase() } : {}),
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: scans.length,
      data: scans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create Scan
const createScan = async (req, res) => {
  try {
    const scan = await Scan.create(req.body);

    res.status(201).json({
      success: true,
      message: "Scan created successfully",
      data: scan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/scan/run
// Body: { brandKey, type: "apps" | "social" | "all", accounts?: [{ platform, username }], country? }
const runScan = async (req, res) => {
  try {
    const { brandKey, type = "all", accounts = [], country } = req.body || {};
    const profile = await brandStore.get(brandKey);
    if (!profile) {
      return res.status(400).json({ success: false, message: "Choose a brand first." });
    }
    if (!["apps", "social", "all"].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be "apps", "social" or "all".' });
    }

    const items = [];
    const errors = [];
    const engines = {};

    if (type === "apps" || type === "all") {
      try {
        items.push(...(await scanService.runAppScan(profile, { country })));
        engines.apps = "app-scanner";
      } catch (err) {
        errors.push({ type: "apps", message: err.message });
      }
    }

    if (type === "social" || type === "all") {
      try {
        const social = await scanService.runSocialScan(profile, Array.isArray(accounts) ? accounts : []);
        items.push(...social.items);
        engines.social = social.engine;
      } catch (err) {
        errors.push({ type: "social", message: err.message });
      }
    }

    // Every requested scan failed
    if (!items.length && errors.length) {
      return res.status(errors[0].message.includes("not running") ? 503 : 502).json({
        success: false,
        message: errors.map(e => e.message).join(" "),
        errors,
      });
    }

    const persisted = await scanService.persist(profile.key, items);

    res.status(200).json({
      success: true,
      brandKey: profile.key,
      scanned: items.length,
      flagged: items.filter(i => i.level === "HIGH" || i.level === "MEDIUM").length,
      engines,
      errors,
      persisted: persisted.saved,
      threats: items.map(scanService.scanItemToQueue),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSocialScan,
  getAppScan,
  createScan,
  runScan,
};