// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmergencyContactSchema = new mongoose.Schema({
  name:     { type: String, trim: true, required: true },
  relation: { type: String, trim: true, default: '' },   
  email:    { type: String, trim: true, default: '' },
  consent:  { type: Boolean, default: false },           
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    
    name:             { type: String, required: true, trim: true },
    surname:          { type: String, required: true, trim: true },
    birthDate:        { type: Date,   required: true },

    
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:     { type: String, required: true },
    role:             { type: String, enum: ['patient', 'therapist'], default: 'patient' },

   
    questionnaireDone:{ type: Boolean, default: false },

   
    consent:          { type: Boolean, default: false },        
    consents: {
      privacy:        { type: Boolean, default: false }           
    },
    privacyConsent:   { type: Boolean, default: false },           

    consentGivenAt:   { type: Date,    required: true },

    
    refreshTokenHash: { type: String,  default: null },

    
    address:          { type: String, trim: true, default: '' },  
    city:             { type: String, trim: true, default: '' },
    cap:              { type: String, trim: true, default: '' },
    phone:            { type: String, trim: true, default: '' },

    emergencyContacts:{ type: [EmergencyContactSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('profileComplete').get(function () {
  const has = (v) => typeof v === 'string' && v.trim().length > 0;
  return has(this.name) && has(this.surname) && has(this.email) &&
         has(this.city) && has(this.address) && has(this.cap) && has(this.phone);
});


userSchema.methods.setRefreshToken = async function (plainToken) {
  this.refreshTokenHash = await bcrypt.hash(plainToken, 10);
};


userSchema.methods.isRefreshTokenValid = async function (plainToken) {
  if (!this.refreshTokenHash) return false;
  return bcrypt.compare(plainToken, this.refreshTokenHash);
};

module.exports = mongoose.model('User', userSchema);


