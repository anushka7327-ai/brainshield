const Brand = require("../models/Brand");
const { dbReady } = require("../config/db");
const { slugify, titleCase, normalizeDomain, buildProfile } = require("./brandEngine");

// Runtime cache. MongoDB (when connected) is the durable copy.
const cache = new Map();

const unique = list => [...new Set(list.filter(Boolean))];

function handleFrom(value) {
  if (!value) return "";
  return String(value).trim().replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop().replace(/^@/, "").toLowerCase();
}

function fromDoc(doc) {
  const website = normalizeDomain(doc.website);
  const domains = unique([...(doc.officialDomains || []), website]);
  const base = buildProfile({ name: doc.brandName, domain: domains[0] });
  const handles = [doc.instagram, doc.facebook, doc.x, doc.linkedin].map(handleFrom);

  return {
    ...base,
    legalName: doc.legalName || doc.brandName,
    officialDomains: domains.length ? domains : base.officialDomains,
    domainAssumed: domains.length === 0,
    officialHandles: unique([...(doc.officialHandles || []), ...handles, base.brandLabel]),
    officialPackageIds: doc.officialPackageIds || [],
    officialDeveloper: doc.developerName || "",
    officialAppName: doc.officialAppName || "",
    officialDescription: doc.officialDescription || "",
    logoUrl: doc.logo || null,
    keywords: doc.keywords || [],
    aiEnriched: Boolean(doc.aiEnriched),
  };
}

function toDoc(profile) {
  return {
    brandName: profile.name,
    slug: profile.key,
    legalName: profile.legalName || profile.name,
    website: profile.domainAssumed ? "" : profile.officialDomains[0],
    logo: profile.logoUrl || "",
    officialAppName: profile.officialAppName || "",
    developerName: profile.officialDeveloper || "",
    officialDescription: profile.officialDescription || "",
    keywords: profile.keywords || [],
    officialDomains: profile.domainAssumed ? [] : profile.officialDomains,
    officialHandles: profile.officialHandles || [],
    officialPackageIds: profile.officialPackageIds || [],
    aiEnriched: Boolean(profile.aiEnriched),
  };
}

// Returns the profile for ANY brand. Unknown brands get a starter profile.
async function get(rawKey, { create = true } = {}) {
  const key = slugify(rawKey);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  if (dbReady()) {
    const doc = await Brand.findOne({ slug: key });
    if (doc) {
      const profile = fromDoc(doc);
      cache.set(key, profile);
      return profile;
    }
  }
  if (!create) return null;

  const profile = buildProfile({ name: titleCase(key) });
  cache.set(key, profile);
  return profile;
}

async function save(profile) {
  cache.set(profile.key, profile);
  if (dbReady()) {
    try {
      await Brand.findOneAndUpdate({ slug: profile.key }, toDoc(profile), {
        upsert: true,
        setDefaultsOnInsert: true,
      });
    } catch (err) {
      console.error("[brandStore] could not save brand:", err.message);
    }
  }
  return profile;
}

// Called when the brand form (/api/brand) creates or updates a document
function syncFromDoc(doc) {
  const profile = fromDoc(doc);
  cache.set(profile.key, profile);
  return profile;
}

const list = () => [...cache.values()];

module.exports = { get, save, syncFromDoc, list };
