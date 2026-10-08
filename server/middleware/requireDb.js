const { dbReady } = require("../config/db");

// Fail immediately instead of letting Mongoose buffer for 10 seconds when MongoDB is down
module.exports = (req, res, next) =>
  dbReady()
    ? next()
    : res.status(503).json({
        success: false,
        message: "The database is not connected. Start MongoDB and restart the server.",
      });
