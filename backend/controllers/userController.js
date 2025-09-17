// backend/controllers/userController.js
const User = require('../models/User');

function getUserIdFromReq(req) {
  return req?.user?._id || req?.user?.id || req?.user?.userId || req?.user?.sub || null;
}

exports.getMe = async (req, res, next) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: 'Non autenticato' });

    const me = await User.findById(userId)
      .select('-passwordHash -refreshTokenHash')
      .lean({ virtuals: true });

    if (!me) return res.status(404).json({ message: 'Utente non trovato' });

    if (me.birthDate && !me.dateOfBirth) me.dateOfBirth = me.birthDate;
    res.json(me);
  } catch (e) { next(e); }
};


exports.updateMe = async (req, res, next) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: 'Non autenticato' });

    const patch = {};

  
    if (req.body.dateOfBirth !== undefined && req.body.birthDate === undefined) {
      patch.birthDate = req.body.dateOfBirth;
    }

    const allowed = [
      'name', 'surname', 'birthDate', 'email',
      'address', 'city', 'cap', 'phone',
      'emergencyContacts',
    ];
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }

   
    if (Array.isArray(patch.emergencyContacts)) {
      patch.emergencyContacts = patch.emergencyContacts
        .slice(0, 2)
        .map(c => ({
          name: String(c?.name || '').trim(),
          relation: String(c?.relation || '').trim(),
          phone: String(c?.phone || '').trim(),
          email: String(c?.email || '').trim(),
          consent: Boolean(c?.consent),
        }))
        
        .filter(c => c.name && c.phone);
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: patch },
      { new: true, runValidators: true }
    )
    .select('-passwordHash -refreshTokenHash')
    .lean({ virtuals: true });

    if (!updated) return res.status(404).json({ message: 'Utente non trovato' });

    res.json(updated);
  } catch (e) { next(e); }
};
