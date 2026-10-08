const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true, trim: true },

    // Lookup key derived from the brand name, e.g. "hdfc_bank"
    slug: { type: String, index: { unique: true, sparse: true } },

    legalName: { type: String, default: "" },
    website: { type: String, default: "" },
    logo: { type: String, default: "" },
    instagram: { type: String, default: "" },
    facebook: { type: String, default: "" },
    x: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    officialAppName: { type: String, default: "" },
    developerName: { type: String, default: "" },
    officialDescription: { type: String, default: "" },
    keywords: { type: [String], default: [] },

    // Official identifiers used to avoid flagging the brand's own assets
    officialDomains: { type: [String], default: [] },
    officialHandles: { type: [String], default: [] },
    officialPackageIds: { type: [String], default: [] },
    aiEnriched: { type: Boolean, default: false },
  },
  { timestamps: true }
);

brandSchema.pre("validate", function () {
  if (!this.slug && this.brandName) {
    this.slug = this.brandName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }
});

module.exports = mongoose.model("Brand", brandSchema);
