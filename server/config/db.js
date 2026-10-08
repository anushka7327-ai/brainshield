const mongoose = require("mongoose");

// A database problem should not take the whole API down: brand lookup, look-alike
// generation and AI features work without MongoDB. Saving and loading scans needs it.
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI is not set. Running without a database (scan history will not be saved).");
    return false;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${connection.connection.host}`);
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.warn("Running without a database. Start MongoDB and restart the server to save scan history.");
    return false;
  }
};

const dbReady = () => mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.dbReady = dbReady;
