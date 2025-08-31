// backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.error('FATAL: manca ACCESS_TOKEN_SECRET o REFRESH_TOKEN_SECRET');
  process.exit(1);
}

const COOKIE_PATH = '/api/auth/refresh';

// Helpers -------------------------------------------------
const generateAccessToken = (user) =>
  jwt.sign({ userId: user._id.toString(), role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });

const generateRefreshToken = (user) =>
  jwt.sign({ userId: user._id.toString() }, REFRESH_SECRET, { expiresIn: '7d' });

// Imposta sia il vero cookie httpOnly sia il cookie-spia leggibile dal client (non sensibile)
const sendRefreshCookies = (res, token) => {
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
  res.cookie('refreshToken', token, opts);
  // cookie spia (NON contiene segreti) per evitare chiamate /refresh inutili
  res.cookie('hasRefresh', '1', {
    httpOnly: false,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: COOKIE_PATH,
    maxAge: opts.maxAge,
  });
};

const clearRefreshCookies = (res) => {
  res.clearCookie('refreshToken', { path: COOKIE_PATH });
  res.clearCookie('hasRefresh', { path: COOKIE_PATH });
  // compat col vecchio path
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.clearCookie('hasRefresh', { path: '/api/auth' });
};

// Dati pubblici utente
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  questionnaireDone: u.questionnaireDone,
});

// Controllers --------------------------------------------

exports.register = async (req, res) => {
  let { name, surname, birthDate, email, password, consent } = req.body;
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');

  const consentBool =
    consent === true ||
    (typeof consent === 'string' && ['true', '1', 'on', 'yes', 'acconsento'].includes(consent.trim().toLowerCase())) ||
    (consent && typeof consent === 'object' && consent.privacy === true);

  if (!name || !surname || !birthDate || !email || !password || consentBool !== true) {
    return res.status(400).json({ message: 'Tutti i campi e il consenso sono obbligatori' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Email non valida' });
  if (password.length < 6) return res.status(400).json({ message: 'Password troppo corta (min 6)' });

  const bd = new Date(birthDate);
  if (Number.isNaN(bd.getTime()) || bd.getTime() > Date.now()) {
    return res.status(400).json({ message: 'Data di nascita non valida' });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email già registrata' });

    const hash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      surname,
      birthDate: bd,
      email,
      role: 'patient',
      passwordHash: hash,
      password: hash,
      consent: true,
      consents: { privacy: true },
      privacyConsent: true,
      consentGivenAt: new Date(),
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    if (typeof user.setRefreshToken === 'function') {
      await user.setRefreshToken(refreshToken);
    }
    await user.save();

    sendRefreshCookies(res, refreshToken);
    return res.status(201).json({ accessToken, user: publicUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

exports.login = async (req, res) => {
  let { email, password } = req.body;
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');

  if (!email || !password) return res.status(400).json({ message: 'Email e password richieste' });

  try {
    const user = await User.findOne({ email }).select('+password +passwordHash +role +approved +refreshTokenHash');
    if (!user) return res.status(401).json({ message: 'Credenziali non valide' });

    const hash = user.passwordHash || user.password;
    if (!hash) return res.status(401).json({ message: 'Credenziali non valide' });

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ message: 'Credenziali non valide' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    if (typeof user.setRefreshToken === 'function') {
      await user.setRefreshToken(refreshToken);
    }
    await user.save();

    sendRefreshCookies(res, refreshToken);
    return res.json({ accessToken, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

// POST/GET /api/auth/refresh
exports.refresh = async (req, res) => {
  const token = req.cookies && req.cookies.refreshToken ? req.cookies.refreshToken : null;
  if (!token) {
    clearRefreshCookies(res);
    return res.status(401).json({ message: 'Nessun refresh token' });
  }

  try {
    const payload = jwt.verify(token, REFRESH_SECRET);

    const user = await User.findById(payload.userId).select('+refreshTokenHash role');
    if (!user) {
      clearRefreshCookies(res);
      return res.status(401).json({ message: 'Utente non trovato' });
    }

    if (typeof user.isRefreshTokenValid === 'function') {
      const valid = await user.isRefreshTokenValid(token);
      if (!valid) {
        clearRefreshCookies(res);
        return res.status(401).json({ message: 'Refresh token non valido' });
      }
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    if (typeof user.setRefreshToken === 'function') {
      await user.setRefreshToken(newRefreshToken);
    }
    await user.save();

    sendRefreshCookies(res, newRefreshToken);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('Refresh error:', err);
    clearRefreshCookies(res);
    return res.status(401).json({ message: 'Refresh token non valido o scaduto' });
  }
};

exports.logout = async (req, res) => {
  const token = req.cookies && req.cookies.refreshToken ? req.cookies.refreshToken : null;

  if (token) {
    try {
      const { userId } = jwt.verify(token, REFRESH_SECRET);
      const user = await User.findById(userId).select('+refreshTokenHash');
      if (user) {
        user.refreshTokenHash = undefined;
        await user.save();
      }
    } catch (e) {}
  }
  clearRefreshCookies(res);
  return res.json({ message: 'Logout effettuato' });
};

// GET /api/auth/me
exports.me = async (req, res) => {
  const u = await User.findById(req.user.id)
    .select(
      'email role name surname birthDate ' +
      'consent consents privacyConsent ' +
      'isMinor parentFirstName parentLastName parentEmail parentPhone ' +
      'questionnaireDone'
    );

  if (!u) return res.status(404).json({ message: 'Utente non trovato' });

  const consentRaw = u.consent ?? u.privacyConsent ?? (u.consents && u.consents.privacy);
  const consentBool =
    typeof consentRaw === 'boolean' ? consentRaw :
    (typeof consentRaw === 'string'
      ? ['true', '1', 'on', 'yes', 'acconsento'].includes(consentRaw.trim().toLowerCase())
      : false);

  res.json({
    _id: u._id,
    email: u.email,
    role: u.role,
    name: u.name ?? null,
    surname: u.surname ?? null,
    birthDate: u.birthDate ?? null,
    consent: consentBool,
    isMinor: u.isMinor ?? null,
    parentFirstName: u.parentFirstName ?? null,
    parentLastName: u.parentLastName ?? null,
    parentEmail: u.parentEmail ?? null,
    parentPhone: u.parentPhone ?? null,
    questionnaireDone: u.questionnaireDone === true,
  });
};

// PATCH /api/auth/me
exports.updateMe = async (req, res) => {
  const allow = ['name', 'surname', 'birthDate', 'email'];
  const patch = {};
  for (const k of allow) if (k in req.body) patch[k] = req.body[k];

  if (patch.name && String(patch.name).trim().length < 2) {
    return res.status(400).json({ message: 'Nome troppo corto.' });
  }
  if (patch.surname && String(patch.surname).trim().length < 2) {
    return res.status(400).json({ message: 'Cognome troppo corto.' });
  }
  if (patch.birthDate) {
    const d = new Date(patch.birthDate);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Data di nascita non valida.' });
    if (d > new Date()) return res.status(400).json({ message: 'La data di nascita non può essere futura.' });
  }

  if (patch.email !== undefined) {
    const emailNorm = String(patch.email).trim().toLowerCase();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(emailNorm)) return res.status(400).json({ message: 'Email non valida.' });
    const duplicate = await User.findOne({ email: emailNorm, _id: { $ne: req.user.id } }).lean();
    if (duplicate) return res.status(409).json({ message: 'Email già in uso.' });
    patch.email = emailNorm;
  }

  const u = await User.findByIdAndUpdate(req.user.id, patch, { new: true })
    .select('email role name surname birthDate consent consents privacyConsent questionnaireDone');

  if (!u) return res.status(404).json({ message: 'Utente non trovato' });

  const consentRaw = u.consent ?? u.privacyConsent ?? (u.consents && u.consents.privacy);
  const consentBool =
    typeof consentRaw === 'boolean' ? consentRaw :
    (typeof consentRaw === 'string'
      ? ['true', '1', 'on', 'yes', 'acconsento'].includes(consentRaw.trim().toLowerCase())
      : false);

  res.json({
    _id: u._id,
    email: u.email,
    role: u.role,
    name: u.name ?? null,
    surname: u.surname ?? null,
    birthDate: u.birthDate ?? null,
    consent: consentBool,
    questionnaireDone: u.questionnaireDone === true,
  });
};



