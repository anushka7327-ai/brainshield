const brandStore = require("../services/brandStore");
const gemini = require("../services/geminiService");
const { evaluateGeneric, analyzeString, publicProfile, labelOf } = require("../services/brandEngine");

const fail = (res, err) => {
  console.error("[Gemini]", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.status === 503 ? err.message : "The AI request failed. Try again in a moment.",
  });
};

// POST /api/ai/analyze-threat  { asset, brandKey }
const analyzeThreat = async (req, res) => {
  const { asset, brandKey } = req.body || {};
  if (!asset || typeof asset !== "object") {
    return res.status(400).json({ success: false, message: "asset is required." });
  }
  try {
    const profile = await brandStore.get(brandKey);
    if (!profile) return res.status(400).json({ success: false, message: "Choose a brand first." });

    const risk = evaluateGeneric({ ...asset, handle: asset.handle || asset.identifier }, profile);
    const aiAnalysis = await gemini.analyzeThreatWithAI({ ...asset, risk }, publicProfile(profile));
    res.json({ success: true, aiAnalysis });
  } catch (err) {
    fail(res, err);
  }
};

// POST /api/ai/takedown-draft  { asset, brandKey }
const takedownDraft = async (req, res) => {
  const { asset, brandKey } = req.body || {};
  if (!asset || typeof asset !== "object") {
    return res.status(400).json({ success: false, message: "asset is required." });
  }
  try {
    const profile = await brandStore.get(brandKey);
    if (!profile) return res.status(400).json({ success: false, message: "Choose a brand first." });

    const draft = await gemini.draftTakedownNotice({
      asset,
      brandName: profile.name,
      legalName: profile.legalName || profile.name,
    });
    res.json({ success: true, draft });
  } catch (err) {
    fail(res, err);
  }
};

// POST /api/ai/chat/stream  { message, history, context }  (Server-Sent Events)
const chatStream = async (req, res) => {
  const { message, history, context } = req.body || {};
  if (!message || typeof message !== "string" || message.length > 4000) {
    return res.status(400).json({ success: false, message: "Enter a message (up to 4000 characters)." });
  }
  if (!gemini.isGeminiConfigured()) {
    return res.status(503).json({ success: false, message: "AI is not set up. Add GEMINI_API_KEY to server/.env and restart the server." });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let closed = false;
  res.on("close", () => { closed = true; });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    for await (const text of gemini.chatWithAnalystStream(message, Array.isArray(history) ? history : [], context)) {
      if (closed) break;
      send("chunk", { text });
    }
    if (!closed) send("done", {});
  } catch (err) {
    console.error("[Gemini] stream error:", err.message);
    if (!closed) send("error", { message: "The AI response was interrupted. Try again." });
  } finally {
    res.end();
  }
};

// POST /api/check-name  { input, brandKey } — no AI needed
const checkName = async (req, res) => {
  const { input, brandKey } = req.body || {};
  if (!input || typeof input !== "string" || input.length > 200) {
    return res.status(400).json({ success: false, message: "Enter a domain, username or app name to check." });
  }
  try {
    const profile = await brandStore.get(brandKey);
    if (!profile) return res.status(400).json({ success: false, message: "Choose a brand first." });
    res.json({
      success: true,
      brandLabel: labelOf(profile),
      ...analyzeString(input, profile),
      risk: evaluateGeneric({ domain: /\./.test(input) ? input.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0] : undefined, handle: input }, profile),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { analyzeThreat, takedownDraft, chatStream, checkName };
