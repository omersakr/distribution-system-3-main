const mongoose = require('mongoose');
const dns = require('dns').promises;
require('dotenv').config({ path: './.env' });

// Force Node to use Google DNS for SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

/**
 * MongoDB connection using Mongoose
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/distribution_system';
    
    console.log('Connecting to MongoDB:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

/**
 * Initialize database connection and models
 */
async function ensureTables() {
  await connectDB();

  // Import all models to ensure they are registered
  require('./models');

  console.log('📦 All MongoDB models loaded successfully');
}

// Export the connection function for backward compatibility
module.exports = {
  ensureTables,
  connectDB,
  mongoose
};
