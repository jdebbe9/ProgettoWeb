// backend/controllers/userController.js
const User = require('../models/User');

// GET /api/user/me
exports.getMe = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id)
      .select('-passwordHash -refreshTokenHash')   // niente segreti
      .lean({ virtuals: true });                   // include profileComplete

    if (!me) return res.status(404).json({ message: 'Utente non trovato' });

    // Alias di compatibilità per eventuali front-end che leggono dateOfBirth
    if (me.birthDate && !me.dateOfBirth) me.dateOfBirth = me.birthDate;

    res.json(me);
  } catch (e) { next(e); }
};

// PATCH /api/user/me
exports.updateMe = async (req, res, next) => {
  try {
    const patch = {};

    // Accettiamo sia birthDate che dateOfBirth (alias)
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

    // Normalizza emergencyContacts (max 2; only known fields)
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
        // almeno nome o telefono per non salvare oggetti vuoti
        .filter(c => c.name || c.phone);
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: patch },
      { new: true, runValidators: true }
    )
    .select('-passwordHash -refreshTokenHash')
    .lean({ virtuals: true });

    res.json(updated);
  } catch (e) { next(e); }
};
