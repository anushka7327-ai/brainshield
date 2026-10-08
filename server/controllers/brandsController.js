const brandStore = require("../services/brandStore");
const { aiLimiter } = require("../middleware/rateLimit");
const { isGeminiConfigured, enrichBrandProfile } = require("../services/geminiService");
const { slugify, normalizeDomain, buildProfile, publicProfile } = require("../services/brandEngine");

const HANDLE = /^[a-z0-9._]{2,30}$/;
const PACKAGE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;

const clean = (list, test, max = 8) =>
  [...new Set((Array.isArray(list) ? list : []).map(x => String(x).trim().toLowerCase().replace(/^@/, "")).filter(test))].slice(0, max);

const setDomains = (profile, domains) => {
  profile.officialDomains = domains;
  profile.domainAssumed = false;
  profile.brandLabel = domains[0].split(".").slice(-2)[0];
};

// POST /api/brands/resolve  { name, domain?, enrich? }
// Works for ANY brand name. Unknown brands get a profile (optionally filled in by AI).
const resolveBrand = async (req, res) => {
  try {
    const { name: rawName, domain: rawDomain, enrich } = req.body || {};
    const name = String(rawName || "").trim();
    const domainInput = rawDomain ? String(rawDomain).trim() : "";
    const domain = normalizeDomain(domainInput);

    if (!name || name.length > 80) {
      return res.status(400).json({ success: false, message: "Enter a brand name (up to 80 characters)." });
    }
    if (domainInput && !domain) {
      return res.status(400).json({ success: false, message: "Enter the website like example.com." });
    }
    const key = slugify(name);
    if (!key) {
      return res.status(400).json({ success: false, message: "The brand name needs letters or numbers." });
    }

    let profile = await brandStore.get(key, { create: false });
    const created = !profile;

    if (created) {
      profile = buildProfile({ name, domain });

      if (enrich !== false && isGeminiConfigured() && aiLimiter.allow(req)) {
        try {
          const e = await enrichBrandProfile(name, domain);
          const domains = clean(e.officialDomains, x => normalizeDomain(x) === x);
          const merged = [...new Set([...(domain ? [domain] : []), ...domains])];
          if (merged.length) setDomains(profile, merged);

          const handles = clean(e.officialHandles, x => HANDLE.test(x));
          profile.officialHandles = [...new Set([...handles, profile.brandLabel])];
          profile.officialPackageIds = clean(e.officialPackageIds, x => PACKAGE.test(x));
          if (typeof e.legalName === "string" && e.legalName.trim() && e.legalName.length <= 120) {
            profile.legalName = e.legalName.trim();
          }
          if (typeof e.officialDeveloper === "string") profile.officialDeveloper = e.officialDeveloper.trim().slice(0, 120);
          if (typeof e.officialDescription === "string") profile.officialDescription = e.officialDescription.trim().slice(0, 400);
          profile.aiEnriched = true;
        } catch (err) {
          console.error("[Gemini] brand enrichment failed:", err.message);
        }
      }
    } else if (domain && !profile.officialDomains.includes(domain)) {
      setDomains(profile, [domain, ...(profile.domainAssumed ? [] : profile.officialDomains)]);
    }

    await brandStore.save(profile);
    res.json({ success: true, created, brandKey: key, profile: publicProfile(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/brands
const listBrands = (req, res) => {
  res.json({ success: true, brands: brandStore.list().map(publicProfile) });
};

// GET /api/brands/:brandKey
const getBrandProfile = async (req, res) => {
  try {
    const profile = await brandStore.get(req.params.brandKey);
    if (!profile) return res.status(400).json({ success: false, message: "Invalid brand." });
    res.json({ success: true, brandKey: profile.key, profile: publicProfile(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/brands/:brandKey  — lets the user correct official identifiers
const updateBrandProfile = async (req, res) => {
  try {
    const profile = await brandStore.get(req.params.brandKey);
    if (!profile) return res.status(400).json({ success: false, message: "Invalid brand." });

    const { officialDomains, officialHandles, officialPackageIds, officialDeveloper, officialDescription } = req.body || {};

    if (Array.isArray(officialDomains)) {
      const domains = [...new Set(officialDomains.map(normalizeDomain).filter(Boolean))].slice(0, 10);
      if (!domains.length) {
        return res.status(400).json({ success: false, message: "Keep at least one valid official website." });
      }
      setDomains(profile, domains);
    }
    if (Array.isArray(officialHandles)) profile.officialHandles = clean(officialHandles, x => HANDLE.test(x), 10);
    if (Array.isArray(officialPackageIds)) profile.officialPackageIds = clean(officialPackageIds, x => PACKAGE.test(x), 10);
    if (typeof officialDeveloper === "string") profile.officialDeveloper = officialDeveloper.trim().slice(0, 120);
    if (typeof officialDescription === "string") profile.officialDescription = officialDescription.trim().slice(0, 400);

    // The user has now reviewed these values
    profile.aiEnriched = false;

    await brandStore.save(profile);
    res.json({ success: true, profile: publicProfile(profile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { resolveBrand, listBrands, getBrandProfile, updateBrandProfile };
