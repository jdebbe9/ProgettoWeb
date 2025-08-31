// backend/controllers/assignmentController.js
const Assignment = require('../models/Assignment');

function uid(req) { return req?.user?._id || req?.user?.id; }
function isTherapist(req){ return req?.user?.role === 'therapist'; }
function isPatient(req){ return req?.user?.role === 'patient'; }

// GET /api/assignments
exports.list = async (req,res,next) => {
  try {
    const me = uid(req);
    const q = {};
    if (isTherapist(req)) { q.therapist = me; if (req.query.patient) q.patient = req.query.patient; }
    else { q.patient = me; }
    const items = await Assignment.find(q)
      .sort({ updatedAt: -1 })
      .populate({ path: 'item', select: 'title author updatedAt status' })
      .lean();
    res.json({ items });
  } catch (e) { next(e); }
};

// POST /api/assignments (solo terapeuta)
exports.create = async (req,res,next) => {
  try {
    const me = uid(req);
    const { patientId, itemType, itemId, note } = req.body || {};
    if (!patientId || !itemType || !itemId) return res.status(400).json({ message: 'Dati incompleti' });
    const doc = await Assignment.create({ patient: patientId, therapist: me, itemType, item: itemId, note: note || '' });
    const pop = await Assignment.findById(doc._id).populate({ path:'item', select:'title author updatedAt status' });
    res.status(201).json(pop);
  } catch (e) { next(e); }
};

// PATCH /api/assignments/:id (terapeuta proprietario o paziente destinatario)
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
      .populate({ path:'item', select:'title author updatedAt status' });
    res.json(updated);
  } catch (e) { next(e); }
};

// DELETE /api/assignments/:id (solo terapeuta proprietario)
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
