const mongoose = require("mongoose");

const threatSchema = new mongoose.Schema(
  {
    brandKey: { type: String, index: true, default: "" },
    name: { type: String, required: true },
    identifier: { type: String, default: "" }, // username, app id or domain
    url: { type: String, default: "" },
    platform: { type: String, required: true }, // Instagram, X, Facebook, Play Store ...
    developer: { type: String, default: "" },
    similarity: { type: Number, required: true },
    riskScore: { type: Number, default: 0 },
    risk: { type: String, enum: ["High", "Medium", "Low"], required: true },
    keywords: { type: [String], default: [] },
    reason: { type: String, default: "" },
    reasons: { type: [String], default: [] },
    source: { type: String, default: "" },
  },
  { timestamps: true }
);

// One record per asset per brand, so repeated scans update instead of duplicating
threatSchema.index({ brandKey: 1, platform: 1, identifier: 1 });

module.exports = mongoose.model("Threat", threatSchema);
