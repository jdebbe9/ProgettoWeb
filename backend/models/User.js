const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:     { type: String, required: true },
    role:             { type: String, enum: ['patient', 'therapist'], default: 'patient' },
    questionnaireDone:{ type: Boolean, default: false },
    consentGivenAt:   { type: Date, required: true },

    // 🔒 Hash del refresh token (rotabile). Niente token in chiaro nel DB.
    refreshTokenHash: { type: String, default: null }
  },
  { timestamps: true }
);


// Salva SOLO l'hash del refresh token (non fa .save(); ci pensano i controller)
userSchema.methods.setRefreshToken = async function (plainToken) {
  this.refreshTokenHash = await bcrypt.hash(plainToken, 10);
};

// Verifica se il refresh token in chiaro corrisponde all'hash salvato
userSchema.methods.isRefreshTokenValid = async function (plainToken) {
  if (!this.refreshTokenHash) return false;
  return bcrypt.compare(plainToken, this.refreshTokenHash);
};

module.exports = mongoose.model('User', userSchema);

