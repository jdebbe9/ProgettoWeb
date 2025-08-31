// backend/models/Book.js
const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  owner:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:  { type: String, required: true, trim: true },
  author: { type: String, trim: true },
  year:   { type: Number },
  isbn:   { type: String, trim: true },
  link:   { type: String, trim: true },
  status: { type: String, enum: ['recommended', 'reading', 'read'], default: 'recommended', index: true },
  note:   { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Book', BookSchema);
