// backend/config/db.js
const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI/MONGODB_URI mancante nel .env');
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connesso');
  } catch (err) {
    console.error('❌ Errore connessione MongoDB:', err.message);
    throw err;
  }
};

