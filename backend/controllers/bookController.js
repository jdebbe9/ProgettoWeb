// backend/controllers/bookController.js
const Book = require('../models/Book');

function getUserId(req) {
  return (req?.user && (req.user._id || req.user.id)) || req?.auth?.userId || null;
}


exports.listBooks = async (req, res, next) => {
  try {
    const owner = getUserId(req);
    const { q, status } = req.query;
    const where = { owner };
    if (status) where.status = status;
    let query = Book.find(where).sort({ updatedAt: -1 });
    if (q) {
      const rx = new RegExp(q, 'i');
      query = Book.find({
        ...where,
        $or: [{ title: rx }, { author: rx }, { note: rx }, { isbn: rx }]
      }).sort({ updatedAt: -1 });
    }
    const items = await query.lean();
    res.json({ items });
  } catch (e) { next(e); }
};


exports.createBook = async (req, res, next) => {
  try {
    const owner = getUserId(req);
    const { title, author, year, isbn, link, status, note } = req.body || {};
    if (!title) return res.status(400).json({ message: 'Titolo obbligatorio' });
    const doc = await Book.create({
      owner, title, author, year, isbn, link,
      status: status || 'recommended',
      note: note || ''
    });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};


exports.getBook = async (req, res, next) => {
  try {
    const owner = getUserId(req);
    const doc = await Book.findOne({ _id: req.params.id, owner }).lean();
    if (!doc) return res.status(404).json({ message: 'Libro non trovato' });
    res.json(doc);
  } catch (e) { next(e); }
};


exports.updateBook = async (req, res, next) => {
  try {
    const owner = getUserId(req);
    const patch = {};
    ['title','author','year','isbn','link','status','note'].forEach(k => {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    });
    const doc = await Book.findOneAndUpdate({ _id: req.params.id, owner }, { $set: patch }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Libro non trovato' });
    res.json(doc);
  } catch (e) { next(e); }
};


exports.deleteBook = async (req, res, next) => {
  try {
    const owner = getUserId(req);
    const del = await Book.findOneAndDelete({ _id: req.params.id, owner });
    if (!del) return res.status(404).json({ message: 'Libro non trovato' });
    res.status(204).send();
  } catch (e) { next(e); }
};
