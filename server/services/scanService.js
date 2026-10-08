const Scan = require("../models/Scan");
const Threat = require("../models/Threat");
const { dbReady } = require("../config/db");
const py = require("./pythonClient");
const { SOCIAL_PLATFORMS, generateCandidates, evaluateGeneric } = require("./brandEngine");

const LEVEL_TO_RISK = { HIGH: "High", MEDIUM: "Medium", LOW: "Low", SAFE: "Low" };

function severityFromLevel(level, score) {
  if (level === "SAFE") return "official";
  if (level === "HIGH") return score >= 90 ? "critical" : "high";
  if (level === "MEDIUM") return "medium";
  return "low";
}

// ---------- scanning ----------
async function runAppScan(profile, { country } = {}) {
  const data = await py.scanApps({
    brand_name: profile.name,
    official_developer: profile.officialDeveloper || "",
    official_description: profile.officialDescription || "",
    limit: 10,
    country: country || "us",
  });

  return data.results.map(r => ({
    scanType: "App",
    kind: "app",
    platform: "Play Store",
    name: r.app_name,
    identifier: r.app_id || r.app_name,
    url: r.url || "",
    developer: r.developer || "",
    similarity: Math.round(r.name_similarity),
    riskScore: Math.round(r.risk_score),
    level: r.risk_level,
    keywords: r.keywords_found || [],
    reasons: r.reasons || [],
    engine: "app-scanner",
  }));
}

// Same output shape as the Python social detector, used only if that service is down
function socialFallback(profile, candidate) {
  const r = evaluateGeneric({ handle: candidate.username, platform: "social" }, profile);
  const level = r.severity === "official" ? "SAFE" : r.riskScore >= 70 ? "HIGH" : r.riskScore >= 40 ? "MEDIUM" : "LOW";
  return {
    platform: candidate.platform,
    username: candidate.username,
    display_name: candidate.display_name || "",
    name_similarity: r.similarity,
    matched_keywords: [],
    risk_score: r.riskScore,
    risk_level: level,
    reasons: r.signals.map(s => s.label),
  };
}

async function runSocialScan(profile, accounts = []) {
  const generated = generateCandidates(profile)
    .filter(c => c.asset.kind === "social")
    .map(c => ({ platform: c.asset.platformLabel, username: c.asset.handle, display_name: "", bio: "" }));

  const supplied = accounts
    .filter(a => a && a.username && SOCIAL_PLATFORMS.includes(a.platform))
    .slice(0, 100)
    .map(a => ({
      platform: a.platform,
      username: String(a.username).replace(/^@/, "").trim().slice(0, 60),
      display_name: String(a.display_name || "").slice(0, 80),
      bio: String(a.bio || "").slice(0, 300),
    }))
    .filter(a => a.username);

  const seen = new Set();
  const candidates = [...supplied, ...generated].filter(c => {
    const k = `${c.platform}|${c.username.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const official_accounts = SOCIAL_PLATFORMS.flatMap(platform =>
    (profile.officialHandles || []).map(username => ({ platform, username }))
  );

  let engine = "social-detector";
  let results;
  try {
    results = (await py.scanSocial({ brand_name: profile.name, official_accounts, candidates })).results;
  } catch (err) {
    if (err.code !== "DETECTION_UNAVAILABLE") throw err;
    engine = "built-in-fallback";
    const officialSet = new Set(official_accounts.map(a => `${a.platform}|${a.username.toLowerCase()}`));
    results = candidates
      .filter(c => !officialSet.has(`${c.platform}|${c.username.toLowerCase()}`))
      .map(c => socialFallback(profile, c));
  }

  return {
    engine,
    items: results.map(r => ({
      scanType: "Social",
      kind: "social",
      platform: r.platform,
      name: r.display_name || `@${r.username}`,
      identifier: r.username,
      url: "",
      developer: "",
      similarity: Math.round(r.name_similarity),
      riskScore: Math.round(r.risk_score),
      level: r.risk_level,
      keywords: r.matched_keywords || [],
      reasons: r.reasons || [],
      engine,
    })),
  };
}

// ---------- saving ----------
async function persist(brandKey, items) {
  if (!dbReady() || !items.length) return { saved: false };
  try {
    await Scan.insertMany(
      items.map(i => ({
        brandKey,
        name: i.name,
        identifier: i.identifier,
        platform: i.platform,
        developer: i.developer,
        similarity: i.similarity,
        riskScore: i.riskScore,
        risk: LEVEL_TO_RISK[i.level] || "Low",
        keywords: i.keywords,
        reason: i.reasons.join(" "),
        scanType: i.scanType,
        engine: i.engine,
      }))
    );

    // Only real concerns become threats; low scores stay in scan history
    const ops = items
      .filter(i => i.level === "HIGH" || i.level === "MEDIUM")
      .map(i => ({
        updateOne: {
          filter: { brandKey, platform: i.platform, identifier: i.identifier },
          update: {
            $set: {
              name: i.name,
              url: i.url,
              developer: i.developer,
              similarity: i.similarity,
              riskScore: i.riskScore,
              risk: LEVEL_TO_RISK[i.level],
              keywords: i.keywords,
              reason: i.reasons.join(" "),
              reasons: i.reasons,
              source: i.engine,
            },
          },
          upsert: true,
        },
      }));
    if (ops.length) await Threat.bulkWrite(ops);
    return { saved: true };
  } catch (err) {
    console.error("[scanService] could not save scan:", err.message);
    return { saved: false, error: err.message };
  }
}

// ---------- queue items (the shape the UI reads) ----------
function scanItemToQueue(i) {
  return {
    id: `scan-${i.platform}-${i.identifier}`,
    kind: i.kind,
    source: "scan",
    identifier: i.identifier,
    title: i.name,
    platformLabel: i.platform,
    technique: null,
    url: i.url || null,
    developer: i.developer || null,
    risk: {
      riskScore: i.riskScore,
      severity: severityFromLevel(i.level, i.riskScore),
      similarity: i.similarity,
      signals: i.reasons.map(label => ({ label, weight: null })),
    },
    asset: { platform: i.platform, identifier: i.identifier, name: i.name, developer: i.developer, url: i.url, keywords: i.keywords },
  };
}

function threatDocToQueue(t) {
  const level = t.risk === "High" ? "HIGH" : t.risk === "Medium" ? "MEDIUM" : "LOW";
  return scanItemToQueue({
    kind: t.platform === "Play Store" ? "app" : "social",
    platform: t.platform,
    identifier: t.identifier || t.name,
    name: t.name,
    url: t.url,
    developer: t.developer,
    similarity: t.similarity,
    riskScore: t.riskScore || 0,
    level,
    keywords: t.keywords,
    reasons: t.reasons && t.reasons.length ? t.reasons : t.reason ? [t.reason] : [],
  });
}

function generatedToQueue({ asset, risk }) {
  return {
    id: asset.id,
    kind: asset.kind,
    source: "generated",
    identifier: asset.domain || asset.handle,
    title: null,
    platformLabel: asset.kind === "domain" ? "Domain" : asset.platformLabel,
    technique: asset.technique,
    url: null,
    developer: null,
    risk,
    asset: { kind: asset.kind, domain: asset.domain, handle: asset.handle, platform: asset.platformLabel || "Domain", technique: asset.technique },
  };
}

async function buildQueue(profile) {
  const generated = generateCandidates(profile).map(generatedToQueue);

  let saved = [];
  if (dbReady()) {
    const docs = await Threat.find({ brandKey: profile.key }).sort({ riskScore: -1 }).limit(200);
    saved = docs.map(threatDocToQueue);
  }

  // A scanned account replaces a generated guess with the same name on the same platform
  const byKey = new Map();
  [...generated, ...saved].forEach(t => byKey.set(`${t.kind}|${t.platformLabel}|${String(t.identifier).toLowerCase()}`, t));

  const threats = [...byKey.values()]
    .filter(t => t.risk.severity !== "official")
    .sort((a, b) => b.risk.riskScore - a.risk.riskScore);

  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  threats.forEach(t => { summary[t.risk.severity] += 1; });
  return { threats, summary };
}

module.exports = { runAppScan, runSocialScan, persist, scanItemToQueue, buildQueue };
