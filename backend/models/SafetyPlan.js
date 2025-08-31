// backend/models/SafetyPlan.js
const mongoose = require('mongoose');

const SafetyPlanSchema = new mongoose.Schema({
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  warningSigns:   [{ type: String, trim: true }],
  copingStrategies:[{ type: String, trim: true }],
  trustedContacts:[{ type: String, trim: true }],
  emergencyNotes: { type: String, trim: true, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('SafetyPlan', SafetyPlanSchema);
