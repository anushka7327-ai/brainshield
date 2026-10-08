const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema(
  {
    brandKey: { type: String, index: true, default: "" },
    name: { type: String, required: true },
    identifier: { type: String, default: "" },
    platform: { type: String, required: true },
    developer: { type: String, default: "" },
    similarity: { type: Number, required: true },
    riskScore: { type: Number, default: 0 },
    risk: { type: String, enum: ["High", "Medium", "Low"], required: true },
    keywords: { type: [String], default: [] },
    reason: { type: String, default: "" },
    scanType: { type: String, enum: ["Social", "App"], required: true },
    engine: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Scan", scanSchema);
