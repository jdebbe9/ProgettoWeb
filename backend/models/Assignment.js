// backend/models/Assignment.js
const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  patient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  itemType:  { type: String, enum: ['Article', 'Book'], required: true },
  item:      { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'itemType' },
  status:    { type: String, enum: ['assigned','in_progress','done'], default: 'assigned', index: true },
  note:      { type: String, trim: true, default: '' }
}, { timestamps: true });


AssignmentSchema.index({ patient: 1, itemType: 1, item: 1 }, { unique: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);
