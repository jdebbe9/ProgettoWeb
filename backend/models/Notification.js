// backend/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // destinatario della notifica
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // tipo (enum "aperto" per didattica)
  type: {
    type: String,
    required: true,
    enum: [
      'APPT_REQUESTED',
      'APPT_ACCEPTED',
      'APPT_REJECTED',
      'APPT_RESCHEDULED',
      'APPT_CANCELLED',
      'APPT_REMINDER',
      'QUESTIONNAIRE_COMPLETED',
      'QUESTIONNAIRE_REMINDER',
      'DIARY_NEW',
      'DIARY_COMMENT'
    ]
  },

  // testo breve per UI
  title: { type: String, required: true, trim: true },
  body:  { type: String, trim: true, default: '' },

  // payload leggero per deep-link (es. { appointmentId, newDate })
  data:  { type: Object, default: {} },

  // letto?
  readAt: { type: Date, default: null },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// indice per paginazione discendente stabile
NotificationSchema.index({ userId: 1, _id: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);

