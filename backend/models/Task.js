// backend/models/Task.js
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  patient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:     { type: String, required: true, trim: true },
  dueDate:   { type: Date },
  done:      { type: Boolean, default: false, index: true },
  note:      { type: String, default: '' },
  createdBy: { type: String, enum: ['therapist','patient'], default: 'therapist' },
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
