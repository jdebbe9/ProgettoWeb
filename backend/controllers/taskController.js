// backend/controllers/taskController.js
const Task = require('../models/Task');

function uid(req){ return req?.user?._id || req?.user?.id; }
function isTherapist(req){ return req?.user?.role === 'therapist'; }
function isPatient(req){ return req?.user?.role === 'patient'; }

// GET /api/tasks  (terapeuta → suoi pazienti, opz. ?patient=ID; paziente → propri)
exports.list = async (req,res,next)=>{
  try{
    const me = uid(req);
    const q = {};
    if (isTherapist(req)) { q.therapist = me; if (req.query.patient) q.patient = req.query.patient; }
    else { q.patient = me; }
    const items = await Task.find(q).sort({ done:1, dueDate:1, createdAt:-1 }).lean();
    res.json({ items });
  }catch(e){ next(e); }
};

// POST /api/tasks  (terapeuta crea per paziente; paziente può crearsi task propri)
exports.create = async (req,res,next)=>{
  try{
    const me = uid(req);
    const { patientId, title, dueDate, note } = req.body || {};
    if (!title) return res.status(400).json({ message:'Titolo obbligatorio' });
    const doc = await Task.create({
      patient: isTherapist(req) ? (patientId || me) : me,
      therapist: isTherapist(req) ? me : (req.body.therapistId || me), // fallback
      title, dueDate, note, createdBy: isTherapist(req) ? 'therapist' : 'patient'
    });
    res.status(201).json(doc);
  }catch(e){ next(e); }
};

// PATCH /api/tasks/:id  (paziente può spuntare done e modificare note proprie)
exports.update = async (req,res,next)=>{
  try{
    const me = uid(req);
    const t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ message:'Non trovato' });
    const meIsTher = isTherapist(req) && String(t.therapist) === String(me);
    const meIsPat  = isPatient(req)   && String(t.patient)   === String(me);
    if (!meIsTher && !meIsPat) return res.status(403).json({ message:'Non autorizzato' });

    const patch = {};
    if (req.body.done !== undefined) patch.done = !!req.body.done;
    if (meIsTher) {
      ['title','dueDate','note'].forEach(k => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
    } else if (meIsPat) {
      if (req.body.note !== undefined) patch.note = req.body.note;
    }
    const updated = await Task.findByIdAndUpdate(t._id, { $set: patch }, { new:true });
    res.json(updated);
  }catch(e){ next(e); }
};

// DELETE /api/tasks/:id (terapeuta proprietario oppure paziente che l’ha creato)
exports.remove = async (req,res,next)=>{
  try{
    const me = uid(req);
    const t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ message:'Non trovato' });
    const allowed = (isTherapist(req) && String(t.therapist)===String(me)) || (isPatient(req) && String(t.patient)===String(me) && t.createdBy==='patient');
    if (!allowed) return res.status(403).json({ message:'Non autorizzato' });
    await t.deleteOne();
    res.status(204).send();
  }catch(e){ next(e); }
};
