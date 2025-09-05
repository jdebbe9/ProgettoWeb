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
      'DIARY_COMMENT',
      // nuovo: assegnazione lettura (articolo/libro)
      'READING_ASSIGNED'
    ]
  },

  // testo breve per UI
  title:   { type: String, required: true, trim: true },

  // TESTO: manteniamo compatibilità sia con "body" che con "message".
  // - "body" è quello storico nel tuo schema originale
  // - "message" è usato in alcuni controller/servizi: li teniamo sincronizzati
  body:    { type: String, trim: true, default: '' },
  message: { type: String, trim: true, default: '' },

  // payload leggero per deep-link (es. { appointmentId, newDate, assignmentId })
  data:  { type: Object, default: {} },

  // destinazione opzionale nel frontend (es. "/materials")
  link:  { type: String, trim: true, default: '' },

  // letto?
  readAt: { type: Date, default: null },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// -------------------- Link di default per tipo --------------------
const DEFAULT_LINK_BY_TYPE = {
  READING_ASSIGNED: '/materials',
  APPT_REQUESTED: '/appointments',
  APPT_ACCEPTED: '/appointments',
  APPT_REJECTED: '/appointments',
  APPT_RESCHEDULED: '/appointments',
  APPT_CANCELLED: '/appointments',
  APPT_REMINDER: '/appointments',
};

function applyBodyMessageAndLink(target = {}) {
  // body <-> message (compat)
  if (target.message && !target.body) target.body = target.message;
  if (target.body && !target.message) target.message = target.body;

  // link di default, se non presente
  const linkEmpty = !target.link || (typeof target.link === 'string' && target.link.trim() === '');
  if (linkEmpty && target.type && DEFAULT_LINK_BY_TYPE[target.type]) {
    target.link = DEFAULT_LINK_BY_TYPE[target.type];
  }
}

// Hook: sincronizza body <-> message e assegna link di default su create/save
NotificationSchema.pre('save', function(next) {
  applyBodyMessageAndLink(this);
  next();
});

// Hook: sincronizza body <-> message e assegna link di default anche su update
NotificationSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  if (update.$set && typeof update.$set === 'object') {
    applyBodyMessageAndLink(update.$set);
  } else {
    applyBodyMessageAndLink(update);
  }
  this.setUpdate(update);
  next();
});

// indice per paginazione discendente stabile
NotificationSchema.index({ userId: 1, _id: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
