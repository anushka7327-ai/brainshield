// Brand-agnostic detection helpers. Nothing here is tied to a specific brand:
// everything is derived from the brand's name and its official identifiers.

const UNICODE_CONFUSABLES = {
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p',
  '\u0441': 'c', '\u0455': 's', '\u0456': 'i', '\u04cf': 'l'
};
const DIGIT_CONFUSABLES = { '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's' };

// Used to generate look-alike candidates
const GENERATE_SWAPS = {
  o: ['0', '\u043e'], l: ['1', 'i'], i: ['1', 'l'], e: ['3', '\u0435'],
  a: ['4', '\u0430'], s: ['5'], m: ['rn'], w: ['vv'], d: ['cl'], p: ['\u0440'], c: ['\u0441']
};

const KEYWORDS = [
  'login', 'signin', 'secure', 'security', 'support', 'verify', 'verification',
  'account', 'wallet', 'help', 'official', 'update', 'refund', 'reward',
  'giveaway', 'claim', 'care', 'billing'
];
const RISKY_TLDS = new Set(['xyz', 'top', 'support', 'online', 'click', 'zip', 'site', 'icu', 'live']);
const SENSITIVE_PERMISSIONS = new Set([
  'READ_SMS', 'RECEIVE_SMS', 'READ_CONTACTS', 'SYSTEM_ALERT_WINDOW',
  'BIND_ACCESSIBILITY_SERVICE', 'REQUEST_INSTALL_PACKAGES'
]);
const SOCIAL_PLATFORMS = ['Instagram', 'X', 'Facebook'];

// ---------- helpers ----------
const slugify = s =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const titleCase = s =>
  String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();

function normalizeDomain(input) {
  if (!input) return null;
  const d = String(input).trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : null;
}

const labelOf = profile => profile.brandLabel || slugify(profile.name).replace(/_/g, '');
const officialDomainsOf = profile =>
  profile.officialDomains && profile.officialDomains.length ? profile.officialDomains : [`${labelOf(profile)}.com`];

function decode(text) {
  let out = [...String(text).toLowerCase()].map(c => UNICODE_CONFUSABLES[c] || c).join('');
  out = out.replace(/rn/g, 'm').replace(/vv/g, 'w');
  return [...out].map(c => DIGIT_CONFUSABLES[c] || c).join('');
}

// Optimal string alignment distance (a swapped pair counts as one edit)
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function similarity(a, b) {
  return 1 - distance(a, b) / Math.max(a.length, b.length, 1);
}

// ---------- profiles ----------
function buildProfile({ name, domain }) {
  const clean = String(name).trim();
  const key = slugify(clean);
  const primary = normalizeDomain(domain);
  const label = primary ? primary.split('.').slice(-2)[0] : key.replace(/_/g, '');
  return {
    key,
    name: clean,
    legalName: clean,
    brandLabel: label,
    officialDomains: [primary || `${label}.com`],
    officialHandles: [label],
    officialPackageIds: [],
    officialDeveloper: '',
    officialAppName: '',
    officialDescription: '',
    logoUrl: null,
    isDynamic: true,
    aiEnriched: false,
    domainAssumed: !primary
  };
}

function publicProfile(profile) {
  return {
    ...profile,
    brandLabel: labelOf(profile),
    officialDomains: officialDomainsOf(profile),
    officialHandles: profile.officialHandles || [labelOf(profile)],
    officialPackageIds: profile.officialPackageIds || []
  };
}

// ---------- identification & scoring ----------
function identify(asset) {
  const domain = asset.domain || (asset.url && /^https?:\/\//.test(asset.url) ? normalizeDomain(asset.url) : null);
  if (domain) {
    const labels = domain.split('.');
    return {
      kind: 'domain', value: domain, labels,
      core: labels.length > 1 ? labels[labels.length - 2] : labels[0],
      tld: labels[labels.length - 1]
    };
  }
  if (asset.packageId) {
    const v = asset.packageId.toLowerCase();
    return { kind: 'app', value: v, core: v.replace(/\./g, '') };
  }
  const raw = String(asset.handle || asset.username || asset.title || asset.name || asset.id || '').toLowerCase();
  const kind = asset.platform === 'google_play' ? 'app' : 'social';
  const value = raw.replace(/^@/, '');
  return { kind, value, core: value.replace(/[^a-z0-9\u0400-\u04ff]/g, '') };
}

function isOfficial(id, profile) {
  if (id.kind === 'domain') {
    return officialDomainsOf(profile).some(o => id.value === o || id.value.endsWith(`.${o}`));
  }
  if (id.kind === 'app') return (profile.officialPackageIds || []).includes(id.value);
  const handles = (profile.officialHandles || []).map(h => h.toLowerCase());
  return handles.includes(id.value) || handles.includes(id.core);
}

const severityOf = score =>
  score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low';

function evaluateGeneric(asset, profile) {
  const label = labelOf(profile);
  const id = identify(asset);

  if (isOfficial(id, profile)) {
    return {
      riskScore: 0, severity: 'official', similarity: 100, decoded: id.core,
      signals: [{ label: 'Matches an official identifier for this brand', weight: 0 }]
    };
  }

  const signals = [];
  const add = (text, weight) => signals.push({ label: text, weight });

  const decoded = decode(id.core);
  const sim = Math.max(similarity(id.core, label), similarity(decoded, label));
  const containsRaw = id.core.includes(label);
  const containsDecoded = decoded.includes(label);
  const hasUnicodeSwap = [...id.core].some(c => UNICODE_CONFUSABLES[c]);

  if ((containsDecoded && !containsRaw) || hasUnicodeSwap) {
    add('Swaps characters for look-alikes (like 0 for o or 1 for l)', 25);
  }
  if (sim >= 0.8) add(`Name is ${Math.round(sim * 100)}% similar to "${profile.name}"`, 40);
  else if (sim >= 0.65) add(`Name is ${Math.round(sim * 100)}% similar to "${profile.name}"`, 20);

  if (containsRaw || containsDecoded) add(`Contains the brand name "${label}"`, 25);

  const brandInSubdomain =
    id.kind === 'domain' && id.labels.length > 2 && id.labels.slice(0, -2).join('.').includes(label);
  if (brandInSubdomain) add('Uses the brand name as a subdomain of an unrelated site', 40);

  const keyword = KEYWORDS.find(k => !label.includes(k) && id.value.includes(k));
  if ((containsRaw || containsDecoded || brandInSubdomain) && keyword) {
    add(`Pairs the brand with "${keyword}", a common phishing word`, 25);
  }

  if (id.kind === 'domain' && RISKY_TLDS.has(id.tld)) {
    add(`Ends in .${id.tld}, a low-cost ending often abused for phishing`, 10);
  }
  if (id.kind === 'domain' && id.core.includes('-')) add('Uses hyphens to mimic a legitimate name', 5);

  if (id.kind === 'app') {
    const risky = (asset.permissions || []).filter(p => SENSITIVE_PERMISSIONS.has(p));
    if (risky.length) add(`Requests sensitive permissions: ${risky.join(', ')}`, Math.min(30, risky.length * 8));
    if (asset.isOfficialPublisher === false) add('Publisher is not verified as the brand', 10);
  }

  const riskScore = Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));
  return { riskScore, severity: severityOf(riskScore), signals, similarity: Math.round(sim * 100), decoded };
}

// Used by the "check a name" tool
function analyzeString(input, profile) {
  const label = labelOf(profile);
  const raw = String(input).toLowerCase().trim();
  const stripped = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  const core = stripped.includes('.') ? stripped.split('.').slice(-2)[0] : stripped.replace(/^@/, '');
  const decoded = decode(core);
  return {
    core,
    decoded,
    hasHomoglyphs: [...core].some(c => UNICODE_CONFUSABLES[c]) || (decoded.includes(label) && !core.includes(label)),
    similarity: Math.round(Math.max(similarity(core, label), similarity(decoded, label)) * 100)
  };
}

// ---------- candidate generation ----------
function domainPermutations(label) {
  const out = [];
  const push = (value, technique) => {
    if (value && value !== label && /^[^\s.]+$/.test(value)) out.push({ value, technique });
  };

  for (let i = 0; i < label.length; i++) push(label.slice(0, i) + label.slice(i + 1), 'Missing letter');
  for (let i = 0; i < label.length; i++) push(label.slice(0, i + 1) + label.slice(i), 'Repeated letter');
  for (let i = 0; i < label.length - 1; i++) {
    push(label.slice(0, i) + label[i + 1] + label[i] + label.slice(i + 2), 'Swapped letters');
  }
  for (let i = 0; i < label.length; i++) {
    for (const swap of GENERATE_SWAPS[label[i]] || []) {
      push(label.slice(0, i) + swap + label.slice(i + 1), 'Look-alike character');
    }
  }
  for (let i = 2; i < label.length - 1; i++) push(`${label.slice(0, i)}-${label.slice(i)}`, 'Added hyphen');
  return out;
}

// Name patterns an impersonator might use. These are candidates, not confirmed live assets.
function generateCandidates(profile, { perTechnique = 5 } = {}) {
  const label = labelOf(profile);
  const [primary] = officialDomainsOf(profile);
  const tld = primary.split('.').slice(1).join('.') || 'com';
  const official = new Set(officialDomainsOf(profile));
  const seen = new Set();
  const raw = [];

  const addDomain = (domain, technique) => {
    if (official.has(domain) || seen.has(domain)) return;
    seen.add(domain);
    raw.push({ id: `gen-domain-${domain}`, kind: 'domain', platform: 'domain', domain, technique });
  };

  domainPermutations(label).forEach(p => addDomain(`${p.value}.${tld}`, p.technique));
  ['login', 'secure', 'support', 'verify', 'help', 'account', 'wallet', 'official'].forEach(k => {
    addDomain(`${label}-${k}.${tld}`, 'Brand plus phishing word');
    addDomain(`${label}${k}.${tld}`, 'Brand plus phishing word');
    addDomain(`${k}-${label}.${tld}`, 'Brand plus phishing word');
  });
  ['co', 'net', 'xyz', 'top', 'support', 'online', 'app'].forEach(t => addDomain(`${label}.${t}`, 'Different domain ending'));

  [`${label}_support`, `${label}.help`, `${label}official`, `real${label}`, `${label}_care`, `${label}_giveaway`]
    .forEach((handle, i) => {
      raw.push({
        id: `gen-social-${handle}`, kind: 'social', platform: 'social',
        platformLabel: SOCIAL_PLATFORMS[i % SOCIAL_PLATFORMS.length], handle, technique: 'Impersonation handle'
      });
    });

  // Score, then keep the strongest few per technique so the list stays varied
  const scored = raw
    .map(asset => ({ asset, risk: evaluateGeneric(asset, profile) }))
    .sort((a, b) => b.risk.riskScore - a.risk.riskScore);

  const counts = {};
  return scored.filter(({ asset }) => {
    counts[asset.technique] = (counts[asset.technique] || 0) + 1;
    return counts[asset.technique] <= perTechnique;
  });
}

module.exports = {
  SOCIAL_PLATFORMS,
  slugify,
  titleCase,
  normalizeDomain,
  labelOf,
  officialDomainsOf,
  buildProfile,
  publicProfile,
  evaluateGeneric,
  analyzeString,
  generateCandidates,
  severityOf
};
