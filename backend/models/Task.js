// backend/models/Task.js
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  patient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null, index: true },
  title:     { type: String, required: true, trim: true },
  dueDate:   { type: Date },
  status:    { type: String, enum: ['in_corso','in_pausa','raggiunto','non_raggiunto','annullato'], default: 'in_corso', index: true },
  done:      { type: Boolean, default: false, index: true },
  note:      { type: String, default: '' },
  createdBy: { type: String, enum: ['therapist','patient'], default: 'therapist' },
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);