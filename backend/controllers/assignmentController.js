// backend/controllers/assignmentController.js
const Assignment = require('../models/Assignment');


let Article, Book;
try { Article = require('../models/Article'); } catch (_) {}
try { Book = require('../models/Book'); } catch (_) {}


let notifyUser = null, Notification = null, emitToUser = null;
try { ({ notifyUser } = require('../services/notify')); } catch (_) {}
try { Notification = require('../models/Notification'); } catch (_) {}
try { ({ emitToUser } = require('../realtime/socket')); } catch (_) {}

function uid(req) { return req?.user?._id || req?.user?.id; }
function isTherapist(req){ return req?.user?.role === 'therapist'; }
function isPatient(req){ return req?.user?.role === 'patient'; }


const ITEM_FIELDS = 'title author updatedAt status purchaseUrl url link';


exports.list = async (req,res,next) => {
  try {
    const me = uid(req);
    const q = {};
    if (isTherapist(req)) { q.therapist = me; if (req.query.patient) q.patient = req.query.patient; }
    else { q.patient = me; }
    const items = await Assignment.find(q)
      .sort({ updatedAt: -1 })
      .populate({ path: 'item', select: ITEM_FIELDS })
      .lean();
    res.json({ items });
  } catch (e) { next(e); }
};


exports.create = async (req,res,next) => {
  try {
    const me = uid(req);
    const { patientId, itemType, itemId, note } = req.body || {};
    if (!patientId || !itemType || !itemId) {
      return res.status(400).json({ message: 'Dati incompleti' });
    }
    if (!isTherapist(req)) {
      return res.status(403).json({ message: 'Non autorizzato' });
    }
  
    const allowedTypes = ['Article', 'Book'];
    if (!allowedTypes.includes(itemType)) {
      return res.status(400).json({ message: 'itemType non valido' });
    }

    
    let itemDoc = null;
    if (itemType === 'Article' && Article) {
      itemDoc = await Article.findById(itemId).select('title author status');
      if (!itemDoc) return res.status(404).json({ message: 'Articolo non trovato' });
      if (itemDoc.author && String(itemDoc.author) !== String(me)) {
        return res.status(403).json({ message: 'Non puoi assegnare un articolo non tuo' });
      }
    } else if (itemType === 'Book' && Book) {
      itemDoc = await Book.findById(itemId).select('title owner');
      if (!itemDoc) return res.status(404).json({ message: 'Libro non trovato' });
      if (itemDoc.owner && String(itemDoc.owner) !== String(me)) {
        return res.status(403).json({ message: 'Non puoi assegnare un libro non tuo' });
      }
    }

   
    const existing = await Assignment.findOne({ patient: patientId, itemType, item: itemId }).lean();
    if (existing) {
      return res.status(409).json({
        message: 'Questo materiale è già stato assegnato a questo paziente.',
        assignmentId: existing._id
      });
    }

    const doc = await Assignment.create({
      patient: patientId,
      therapist: me,
      itemType,
      item: itemId,
      note: note || ''
    });

    const pop = await Assignment.findById(doc._id)
      .populate({ path:'item', select: ITEM_FIELDS });

    
    (async () => {
      try {
        const notifPayload = {
          type: 'READING_ASSIGNED',
          title: 'Nuova lettura assegnata',
          message: pop?.item?.title
            ? `Ti è stata assegnata la lettura: "${pop.item.title}"`
            : 'Hai una nuova lettura assegnata',
          data: { assignmentId: String(pop._id), itemType, itemId: String(itemId) },
          link: '/materials'
        };

        if (typeof notifyUser === 'function') {
          await notifyUser(patientId, notifPayload);
          if (emitToUser && Notification) {
            try {
              const unreadCount = await Notification.countDocuments({ userId: patientId, readAt: null });
              emitToUser(patientId, 'notifications:unread', { count: unreadCount });
            } catch (_) {}
          }
        } else if (Notification) {
          const saved = await Notification.create({
            userId: patientId,
            type: notifPayload.type,
            title: notifPayload.title,
            body: notifPayload.message,
            message: notifPayload.message,
            data: notifPayload.data,
            link: notifPayload.link
          });
          if (emitToUser) {
            emitToUser(patientId, 'notification:new', saved);
            try {
              const unreadCount = await Notification.countDocuments({ userId: patientId, readAt: null });
              emitToUser(patientId, 'notifications:unread', { count: unreadCount });
            } catch (_) {}
          }
        } else if (emitToUser) {
          emitToUser(patientId, 'notification:new', notifPayload);
        }
      } catch (_) {}
    })();

    res.status(201).json(pop);
  } catch (e) {
   
    if (e && e.code === 11000) {
      return res.status(409).json({ message: 'Questo materiale è già stato assegnato a questo paziente.' });
    }
    next(e);
  }
};

exports.update = async (req,res,next) => {
  try {
    const me = uid(req);
    const a = await Assignment.findById(req.params.id);
    if (!a) return res.status(404).json({ message:'Non trovato' });
    const meIsTher = isTherapist(req) && String(a.therapist) === String(me);
    const meIsPat  = isPatient(req)   && String(a.patient)   === String(me);
    if (!meIsTher && !meIsPat) return res.status(403).json({ message:'Non autorizzato' });

    const patch = {};
    if (meIsTher) {
      ['status','note'].forEach(k => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
    } else if (meIsPat) {
      const allowed = ['assigned','in_progress','done'];
      if (req.body.status && allowed.includes(req.body.status)) patch.status = req.body.status;
    }
    const updated = await Assignment.findByIdAndUpdate(a._id, { $set: patch }, { new: true })
      .populate({ path:'item', select:'title author updatedAt status purchaseUrl url link' });
    res.json(updated);
  } catch (e) { next(e); }
};


exports.remove = async (req,res,next) => {
  try {
    const me = uid(req);
    const a = await Assignment.findById(req.params.id);
    if (!a) return res.status(404).json({ message:'Non trovato' });
    if (!(isTherapist(req) && String(a.therapist) === String(me))) {
      return res.status(403).json({ message:'Non autorizzato' });
    }
    await a.deleteOne();
    res.status(204).send();
  } catch (e) { next(e); }
};

