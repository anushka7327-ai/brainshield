const axios = require("axios");

const baseUrl = () => process.env.DETECTION_SERVICE_URL || "http://127.0.0.1:8001";

function toError(err) {
  if (err.response) {
    const detail = err.response.data && err.response.data.detail;
    const text = typeof detail === "string" ? detail : JSON.stringify(detail || err.response.data);
    const e = new Error(`Detection service error: ${text}`);
    e.status = 502;
    e.code = "DETECTION_FAILED";
    return e;
  }
  const e = new Error('The detection service is not running. Start it with "npm run dev:detection".');
  e.status = 503;
  e.code = "DETECTION_UNAVAILABLE";
  return e;
}

async function post(path, body, timeout) {
  try {
    const { data } = await axios.post(`${baseUrl()}${path}`, body, { timeout });
    return data;
  } catch (err) {
    throw toError(err);
  }
}

// Google Play lookups can be slow, so allow a longer timeout
const scanApps = body => post("/scan/apps", body, 60_000);
const scanSocial = body => post("/scan/social", body, 15_000);

async function health() {
  try {
    await axios.get(`${baseUrl()}/health`, { timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

module.exports = { scanApps, scanSocial, health };
