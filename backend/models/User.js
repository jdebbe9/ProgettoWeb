// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Anagrafica
    name:             { type: String, required: true, trim: true },
    surname:          { type: String, required: true, trim: true },
    birthDate:        { type: Date,   required: true },

    // Account
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:     { type: String, required: true },
    role:             { type: String, enum: ['patient', 'therapist'], default: 'patient' },

    // Stato app
    questionnaireDone:{ type: Boolean, default: false },

    // Consenso privacy (supporto a più schemi, così /auth/me può normalizzare)
    consent:          { type: Boolean, default: false },          // schema semplice
    consents: {
      privacy:        { type: Boolean, default: false }           // schema annidato
    },
    privacyConsent:   { type: Boolean, default: false },           // eventuale alias

    consentGivenAt:   { type: Date,    required: true },

    // 🔒 Hash del refresh token (rotabile). Niente token in chiaro nel DB.
    refreshTokenHash: { type: String,  default: null }
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


