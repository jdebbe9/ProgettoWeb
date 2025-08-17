const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    patient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date:      { type: Date, required: true, index: true },
    status:    { type: String, enum: ['pending', 'accepted', 'cancelled'], default: 'pending' },
    notes:     { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

AppointmentSchema.index({ therapist: 1, date: 1 });
module.exports = mongoose.model('Appointment', AppointmentSchema);


