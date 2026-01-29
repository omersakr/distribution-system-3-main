const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

/**
 * MongoDB connection using Mongoose
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/distribution_system';
    
    console.log('Connecting to MongoDB:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
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
