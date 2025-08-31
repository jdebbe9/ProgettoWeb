// backend/models/Article.js
const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  abstract: { type: String, default: '' },
  body: { type: String, default: '' },
  tags: [{ type: String, trim: true }],
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
}, { timestamps: true });

ArticleSchema.index({ title: 'text', abstract: 'text', body: 'text' });

module.exports = mongoose.model('Article', ArticleSchema);
