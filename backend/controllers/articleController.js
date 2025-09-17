// backend/controllers/articleController.js
const Article = require('../models/Article');

function getUserId(req) {
  return (req?.user && (req.user._id || req.user.id)) || req?.auth?.userId || null;
}


exports.listPublishedArticles = async (req, res, next) => {
  try {
    const { q, tag, limit, author } = req.query;

    const where = { status: 'published' };
    if (author) where.author = author;
    if (tag) where.tags = { $in: [tag] };

    let query = Article.find(where).sort({ updatedAt: -1 });

    if (q) {
      const rx = new RegExp(q, 'i');
      query = Article.find({
        ...where,
        $or: [{ title: rx }, { abstract: rx }, { body: rx }, { tags: rx }]
      }).sort({ updatedAt: -1 });
    }

    const lim = Math.min(parseInt(limit, 10) || 20, 100);
    const items = await query.limit(lim).lean();

    res.json({ items });
  } catch (e) { next(e); }
};


exports.getPublishedArticle = async (req, res, next) => {
  try {
    const doc = await Article.findOne({ _id: req.params.id, status: 'published' }).lean();
    if (!doc) return res.status(404).json({ message: 'Articolo non trovato o non pubblicato' });
    res.json(doc);
  } catch (e) { next(e); }
};


exports.listArticles = async (req, res, next) => {
  try {
    const author = getUserId(req);
    const { q, status, tag } = req.query;
    const where = { author };
    if (status) where.status = status;
    if (tag) where.tags = { $in: [tag] };
    let query = Article.find(where).sort({ updatedAt: -1 });
    if (q) {
      const rx = new RegExp(q, 'i');
      query = Article.find({
        ...where,
        $or: [{ title: rx }, { abstract: rx }, { body: rx }, { tags: rx }]
      }).sort({ updatedAt: -1 });
    }
    const items = await query.lean();
    res.json({ items });
  } catch (e) { next(e); }
};


exports.createArticle = async (req, res, next) => {
  try {
    const author = getUserId(req);
    const { title, abstract, body, tags, status } = req.body || {};
    if (!title) return res.status(400).json({ message: 'Titolo obbligatorio' });
    const doc = await Article.create({
      author, title, abstract, body,
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(s=>s.trim()).filter(Boolean) : []),
      status: status || 'draft',
    });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};


exports.getArticle = async (req, res, next) => {
  try {
    const author = getUserId(req);
    const doc = await Article.findOne({ _id: req.params.id, author }).lean();
    if (!doc) return res.status(404).json({ message: 'Articolo non trovato' });
    res.json(doc);
  } catch (e) { next(e); }
};


exports.updateArticle = async (req, res, next) => {
  try {
    const author = getUserId(req);
    const patch = {};
    ['title', 'abstract', 'body', 'status'].forEach(k => {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    });
    if (req.body.tags !== undefined) {
      patch.tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : (typeof req.body.tags === 'string' ? req.body.tags.split(',').map(s=>s.trim()).filter(Boolean) : []);
    }
    const doc = await Article.findOneAndUpdate({ _id: req.params.id, author }, { $set: patch }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Articolo non trovato' });
    res.json(doc);
  } catch (e) { next(e); }
};


exports.deleteArticle = async (req, res, next) => {
  try {
    const author = getUserId(req);
    const del = await Article.findOneAndDelete({ _id: req.params.id, author });
    if (!del) return res.status(404).json({ message: 'Articolo non trovato' });
    res.status(204).send();
  } catch (e) { next(e); }
};
