// backend/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({

  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },


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
  
      'READING_ASSIGNED'
    ]
  },

  title:   { type: String, required: true, trim: true },


  body:    { type: String, trim: true, default: '' },
  message: { type: String, trim: true, default: '' },

  data:  { type: Object, default: {} },

  link:  { type: String, trim: true, default: '' },


  readAt: { type: Date, default: null },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});


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

  if (target.message && !target.body) target.body = target.message;
  if (target.body && !target.message) target.message = target.body;

  
  const linkEmpty = !target.link || (typeof target.link === 'string' && target.link.trim() === '');
  if (linkEmpty && target.type && DEFAULT_LINK_BY_TYPE[target.type]) {
    target.link = DEFAULT_LINK_BY_TYPE[target.type];
  }
}


NotificationSchema.pre('save', function(next) {
  applyBodyMessageAndLink(this);
  next();
});


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


NotificationSchema.index({ userId: 1, _id: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
