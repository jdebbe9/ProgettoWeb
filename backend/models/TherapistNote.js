const mongoose = require('mongoose');
const { Schema } = mongoose;

const TherapistNoteSchema = new Schema(
  {
    therapistId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text:        { type: String, default: '' },
  },
  { timestamps: true }
);

// Una sola nota per (terapeuta, paziente)
TherapistNoteSchema.index({ therapistId: 1, patientId: 1 }, { unique: true });

module.exports = mongoose.model('TherapistNote', TherapistNoteSchema);
