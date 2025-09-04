// backend/models/Appointment.js
const { Schema, Types, model } = require('mongoose');

const appointmentSchema = new Schema(
  {
    patient:   { type: Types.ObjectId, ref: 'User', required: true, index: true },
    therapist: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    date:      { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'cancelled',
        'rescheduled',     // ⬅️ aggiunto per la riprogrammazione a slot
        // sinonimi legacy accettati per compatibilità (verranno normalizzati)
        'confirmed',
        'declined',
        'canceled',
      ],
      default: 'pending',
      index: true,
    },

    // ⬇️ Nuovi campi per la modalità online
    // Preferenza indicata dal paziente al momento della richiesta
    requestedOnline: { type: Boolean, default: false },

    // Modalità decisa dal terapeuta all'accettazione
    isOnline:  { type: Boolean, default: false },
    videoLink: { type: String, default: '', trim: true },

    createdBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Normalizza eventuali sinonimi legacy
appointmentSchema.pre('save', function normalizeStatus(next) {
  if (this.isModified('status') && typeof this.status === 'string') {
    const s = this.status.toLowerCase();
    const map = {
      confirmed: 'accepted',
      declined: 'rejected',
      decline:  'rejected',
      canceled: 'cancelled',
    };
    this.status = map[s] || s;
  }
  next();
});

module.exports = model('Appointment', appointmentSchema);




