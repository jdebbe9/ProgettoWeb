// backend/models/PasswordResetToken.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date,   required: true, index: true },
    usedAt:    { type: Date }
  },
  { timestamps: true }
);

// TTL: elimina automaticamente i token dopo la scadenza
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordResetToken', schema);
