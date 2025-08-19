const mongoose = require('mongoose');
const { Schema } = mongoose;

const PasswordResetTokenSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token:    { type: String, required: true },
  // niente "index: true" qui, il TTL lo gestiamo sotto
  expiresAt:{ type: Date, required: true }
});

// TTL: scade esattamente alla data indicata
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordResetToken', PasswordResetTokenSchema);

