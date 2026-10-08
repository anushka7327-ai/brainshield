const express = require("express");
const c = require("../controllers/aiController");
const { aiLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.use(aiLimiter.middleware);
router.post("/analyze-threat", c.analyzeThreat);
router.post("/takedown-draft", c.takedownDraft);
router.post("/chat/stream", c.chatStream);

module.exports = router;
