// backend/controllers/passwordController.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const sendEmail = require('../utils/sendEmail');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// POST /api/auth/forgot-password  { email }
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email obbligatoria.' });

    const user = await User.findOne({ email });
    // Risposta "neutra" per non rivelare se l'email esiste
    const generic = { message: 'Se esiste un account con questa email, riceverai un link per reimpostare la password.' };

    if (!user) return res.json(generic);

    // invalida eventuali token precedenti dello stesso utente
    await PasswordResetToken.deleteMany({ user: user._id });

    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minuti

    await PasswordResetToken.create({ user: user._id, tokenHash, expiresAt });

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${raw}`;
    const body = [
      'Hai richiesto il reset della password su PsicoCare.',
      'Se non sei stato tu, ignora questa email.',
      '',
      `Per reimpostare la password clicca qui (valido 15 minuti):`,
      resetUrl
    ].join('\n');

    await sendEmail(user.email, 'Reset password', body);

    // in dev, ritorna anche il link per comodità
    const payload = process.env.NODE_ENV === 'production'
      ? generic
      : { ...generic, devResetUrl: resetUrl };

    res.json(payload);
  } catch (e) { next(e); }
};

// POST /api/auth/reset-password  { token, password }
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ message: 'Token e nuova password sono obbligatori.' });
    if (password.length < 6) return res.status(400).json({ message: 'Password troppo corta (min 6).' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const prt = await PasswordResetToken.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
      usedAt: { $exists: false }
    });
    if (!prt) return res.status(400).json({ message: 'Token non valido o scaduto.' });

    const user = await User.findById(prt.user);
    if (!user) return res.status(400).json({ message: 'Utente non trovato.' });

    const hash = await bcrypt.hash(password, 10);
    // prova a coprire entrambi i campi usati nel tuo schema
    if ('passwordHash' in user) user.passwordHash = hash;
    if ('password'      in user) user.password      = hash;
    user.passwordChangedAt = new Date();

    // invalida refresh token esistenti (dipende dal tuo schema)
    if ('refreshTokens'    in user) user.refreshTokens = [];
    if ('refreshTokenHash' in user) user.refreshTokenHash = undefined;

    await user.save();

    prt.usedAt = new Date();
    await prt.save();

    res.json({ message: 'Password aggiornata. Ora puoi accedere con le nuove credenziali.' });
  } catch (e) { next(e); }
};
