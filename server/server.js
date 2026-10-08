// Load environment variables first: other modules read them when they are required.
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const { dbReady } = connectDB;
const { isGeminiConfigured } = require("./services/geminiService");
const detection = require("./services/pythonClient");

// Routes
const brandRoutes = require("./routes/brandRoutes");       // saved brand profiles (form)
const brandsRoutes = require("./routes/brandsRoutes");     // resolve ANY brand by name
const dashboardRoutes = require("./routes/dashboardRoutes");
const scanRoutes = require("./routes/scanRoutes");
const threatRoutes = require("./routes/threatRoutes");     // raw saved threats
const queueRoutes = require("./routes/queueRoutes");       // threat queue for the UI
const aiRoutes = require("./routes/aiRoutes");
const { checkName } = require("./controllers/aiController");
const requireDb = require("./middleware/requireDb");

const app = express();

// ===============================
// Middleware
// ===============================
app.use(cors());
app.use(express.json({ limit: "200kb" }));

// ===============================
// Routes
// ===============================
app.get("/", (req, res) => {
  res.json({ success: true, message: "SentinelDRP backend is running" });
});

app.get("/api/health", async (req, res) => {
  res.json({
    success: true,
    status: "ONLINE",
    database: dbReady() ? "connected" : "not connected",
    detectionService: (await detection.health()) ? "online" : "offline",
    aiEnabled: isGeminiConfigured(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/brand", requireDb, brandRoutes);
app.use("/api/brands", brandsRoutes);
app.use("/api/dashboard", requireDb, dashboardRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/threat", requireDb, threatRoutes);
app.use("/api/threats", queueRoutes);
app.use("/api/ai", aiRoutes);
app.post("/api/check-name", checkName);

// ===============================
// Errors
// ===============================
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: `No route for ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "The request body is not valid JSON." });
  }
  res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
});

// ===============================
// Start
// ===============================
const PORT = process.env.PORT || 8000;

connectDB().finally(() => {
  app.listen(PORT, () => {
    console.log(`SentinelDRP server running on http://localhost:${PORT}`);
    console.log(`AI: ${isGeminiConfigured() ? "on" : "off (set GEMINI_API_KEY in server/.env)"}`);
  });
});
