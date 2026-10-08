// Small in-memory limiter for AI endpoints (swap for express-rate-limit when deploying behind a proxy).
function createLimiter({ max = 20, windowMs = 60_000 } = {}) {
  const hits = new Map();
  setInterval(() => hits.clear(), 10 * 60_000).unref();

  const allow = req => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter(t => now - t < windowMs);
    if (recent.length >= max) return false;
    recent.push(now);
    hits.set(req.ip, recent);
    return true;
  };

  const middleware = (req, res, next) =>
    allow(req)
      ? next()
      : res.status(429).json({ success: false, message: "Too many AI requests. Wait a minute and try again." });

  return { allow, middleware };
}

module.exports = { createLimiter, aiLimiter: createLimiter() };
