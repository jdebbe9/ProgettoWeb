// backend/controllers/taskController.js
const Task = require('../models/Task');


function uid(req) {
  return req && req.user ? (req.user._id || req.user.id) : null;
}
function isTherapist(req) {
  return req && req.user && req.user.role === 'therapist';
}
function isPatient(req) {
  return req && req.user && req.user.role === 'patient';
}

var ALLOWED_STATUS = ['in_corso','in_pausa','raggiunto','non_raggiunto','annullato'];


function normalizeStatus(val, fallback) {
  if (fallback === undefined) fallback = 'in_corso';
  if (val === undefined || val === null) return fallback;
  var s0 = String(val).trim().toLowerCase().replace(/\s+/g, '_');
  var map = {
    ongoing: 'in_corso',
    progress: 'in_corso',
    pausa: 'in_pausa',
    paused: 'in_pausa',
    resume: 'in_corso',
    completato: 'raggiunto',
    completed: 'raggiunto',
    'nonraggiunto': 'non_raggiunto',
    'non-raggiunto': 'non_raggiunto',
    'non__raggiunto': 'non_raggiunto',
    failed: 'non_raggiunto',
    cancellato: 'annullato',
    canceled: 'annullato',
    cancelled: 'annullato',
    deleted: 'annullato',
  };
  var s = map[s0] || s0;
  return ALLOWED_STATUS.indexOf(s) >= 0 ? s : fallback;
}


function enforceStatusDoneConsistency(obj) {
  var status = normalizeStatus(obj && obj.status, (obj && obj.done) ? 'raggiunto' : 'in_corso');
  var done = !!(obj && obj.done);

  if (status === 'raggiunto') done = true;
  else done = false;

  if (done === true && status !== 'raggiunto') {
    status = 'raggiunto';
    done = true;
  }
  return { status: status, done: done };
}

function sanitizeDate(val) {
  if (val === undefined || val === null || val === '') return null;
  var d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}


async function resolveTherapistId(req, me) {
 
  if (isTherapist(req) && me) return me;

  if (req && req.user && req.user.therapist) return req.user.therapist;


  if (req && req.body && req.body.therapist) return req.body.therapist;
  if (req && req.query && req.query.therapist) return req.query.therapist;

 
  if (me) {
    var lastTask = await Task.findOne({ patient: me }).sort({ createdAt: -1 }).select('therapist').lean();
    if (lastTask && lastTask.therapist) return lastTask.therapist;
  }


  try {
    var email = process.env.THERAPIST_EMAIL;
    if (email) {
      var User = require('../models/User');
      if (User && User.findOne) {
        var u = await User.findOne({ email: email }).select('_id').lean();
        if (u && u._id) return u._id;
      }
    }
  } catch (e) {
    
  }

  return me;
}


exports.list = async function(req, res, next) {
  try {
    var me = uid(req);
    var q = {};
    if (isTherapist(req)) {
      q.therapist = me;
      if (req.query && req.query.patient) q.patient = req.query.patient;
    } else {
      q.patient = me;
    }

    var raw = await Task.find(q).sort({ done:1, dueDate:1, createdAt:-1 }).lean();


    var items = raw.map(function(it){
      var coerced = enforceStatusDoneConsistency({ status: it.status, done: it.done });
      it.status = coerced.status;
      it.done = coerced.done;
      return it;
    });

    res.json({ items: items });
  } catch (e) { next(e); }
};


exports.create = async function(req, res, next) {
  try {
    const me = req && req.user ? (req.user._id || req.user.id) : null;

    
    const ALLOWED = ['in_corso','in_pausa','raggiunto','non_raggiunto'];
    const rawStatus = (req.body && req.body.status) ? String(req.body.status).trim().toLowerCase().replace(/\s+/g,'_') : 'in_corso';
    const status = ALLOWED.includes(rawStatus) ? rawStatus : 'in_corso';

    const payload = {
      title: String((req.body && req.body.title) || '').trim(),
      note:  (req.body && req.body.note)  || '',
      dueDate: (req.body && req.body.dueDate) ? new Date(req.body.dueDate) : null,
      status,                          
      done: status === 'raggiunto',     
      patient: me,                      
      therapist: (req.user && req.user.therapist) || null, 
      createdBy: (req.user && req.user.role === 'therapist') ? 'therapist' : 'patient',
    };

    if (!payload.title) return res.status(400).json({ message: 'Titolo obbligatorio' });
    const created = await Task.create(payload);
    res.status(201).json(created);
  } catch (e) { next(e); }
};

exports.update = async function(req, res, next) {
  try {
    const t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Non trovato' });

    const patch = {};

    if (req.body && typeof req.body.title === 'string') patch.title = req.body.title.trim();
    if (req.body && typeof req.body.note === 'string')  patch.note  = req.body.note;
    if (req.body && 'dueDate' in req.body)              patch.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;

  
    const ALLOWED = ['in_corso','in_pausa','raggiunto','non_raggiunto'];
    if (req.body && typeof req.body.status === 'string') {
      const s0 = req.body.status.trim().toLowerCase().replace(/\s+/g,'_');
      if (ALLOWED.includes(s0)) patch.status = s0;
    }

    const finalStatus = (patch.status !== undefined) ? patch.status : t.status;
    patch.done = (finalStatus === 'raggiunto');

    Object.assign(t, patch);
    await t.save();
    res.json(t);
  } catch (e) { next(e); }
};


exports.remove = async function(req, res, next) {
  try {
    var me = uid(req);
    var t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Non trovato' });

    var therapistOwns = String(t.therapist) === String(me);
    var patientOwns = String(t.patient) === String(me);
    var allowed = (isTherapist(req) && therapistOwns) || (isPatient(req) && patientOwns);
    if (!allowed) return res.status(403).json({ message: 'Non autorizzato' });

    await t.deleteOne();
    res.status(204).send();
  } catch (e) { next(e); }
};