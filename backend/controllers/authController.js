// backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// === ENV richieste ===
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.error('FATAL: manca ACCESS_TOKEN_SECRET o REFRESH_TOKEN_SECRET');
  process.exit(1);
}

// Helpers -------------------------------------------------
const generateAccessToken = (user) =>
  jwt.sign({ userId: user._id.toString(), role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });

const generateRefreshToken = (user) =>
  jwt.sign({ userId: user._id.toString() }, REFRESH_SECRET, { expiresIn: '7d' });

const sendRefreshToken = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

// Dati pubblici utente (ora include 'name')
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  questionnaireDone: u.questionnaireDone
});

// Controllers --------------------------------------------

// POST /api/auth/register
exports.register = async (req, res) => {
  // campi richiesti
  let { name, surname, birthDate, email, password, consent } = req.body;

  // normalizza
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');

  // accetta anche formati diversi per "consent"
  const consentBool =
    consent === true ||
    (typeof consent === 'string' && ['true', '1', 'on', 'yes', 'acconsento'].includes(consent.trim().toLowerCase())) ||
    (consent && typeof consent === 'object' && consent.privacy === true);

  if (!name || !surname || !birthDate || !email || !password || consentBool !== true) {
    return res.status(400).json({ message: 'Tutti i campi e il consenso sono obbligatori' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Email non valida' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password troppo corta (min 6)' });
  }
  // birthDate deve essere una data valida NON futura
  const bd = new Date(birthDate);
  if (Number.isNaN(bd.getTime()) || bd.getTime() > Date.now()) {
    return res.status(400).json({ message: 'Data di nascita non valida' });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email già registrata' });

    const hash = await bcrypt.hash(password, 10);

    // NB: ruolo forzato a "patient" (il terapeuta è solo da seed)
    const user = new User({
      name,
      surname,
      birthDate: bd,
      email,
      role: 'patient',
      passwordHash: hash,
      // retro-compatibilità: se lo schema usa "password" per l'hash
      password: hash,
      // ⬇️ consenso salvato in tutti gli schemi possibili
      consent: true,
      consents: { privacy: true },
      privacyConsent: true,
      consentGivenAt: new Date()
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await user.setRefreshToken(refreshToken);
    await user.save();

    sendRefreshToken(res, refreshToken);
    return res.status(201).json({ accessToken, user: publicUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  let { email, password } = req.body;
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');

  if (!email || !password) return res.status(400).json({ message: 'Email e password richieste' });

  try {
    // Se nello schema password/passwordHash sono select:false, li includo esplicitamente
    const user = await User.findOne({ email }).select('+password +passwordHash +role +approved +refreshTokenHash');
    if (!user) return res.status(401).json({ message: 'Credenziali non valide' });

    const hash = user.passwordHash || user.password;
    if (!hash) return res.status(401).json({ message: 'Credenziali non valide' });

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ message: 'Credenziali non valide' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await user.setRefreshToken(refreshToken); // rotazione
    await user.save();

    sendRefreshToken(res, refreshToken);
    return res.json({ accessToken, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: 'Nessun refresh token' });

  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    const user = await User.findById(payload.userId).select('+refreshTokenHash');
    if (!user) return res.status(401).json({ message: 'Utente non trovato' });

    const valid = await user.isRefreshTokenValid(token);
    if (!valid) return res.status(401).json({ message: 'Refresh token non valido' });

    // Rotazione token
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await user.setRefreshToken(newRefreshToken);
    await user.save();

    sendRefreshToken(res, newRefreshToken);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(401).json({ message: 'Refresh token non valido o scaduto' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const { userId } = jwt.verify(token, REFRESH_SECRET);
      const user = await User.findById(userId).select('+refreshTokenHash');
      if (user) {
        user.refreshTokenHash = undefined;
        await user.save();
      }
    } catch {
      // token non valido: ignora
    }
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  return res.json({ message: 'Logout effettuato' });
};

exports.me = async (req, res) => {
  const u = await User.findById(req.user.id)
    .select(
      'email role name surname birthDate ' +
      'consent consents privacyConsent ' +
      'isMinor parentFirstName parentLastName parentEmail parentPhone ' +
      'questionnaireDone'
    );

  if (!u) return res.status(404).json({ message: 'Utente non trovato' });

  // Normalizzazione robusta del consenso privacy
  const consentRaw =
    u.consent ??
    u.privacyConsent ??
    (u.consents && u.consents.privacy);

  const consentBool = (() => {
    if (typeof consentRaw === 'boolean') return consentRaw;
    if (typeof consentRaw === 'string') {
      const v = consentRaw.trim().toLowerCase();
      return v === 'true' || v === '1' || v === 'on' || v === 'yes' || v === 'acconsento';
    }
    return false;
  })();

  res.json({
    _id: u._id,
    email: u.email,
    role: u.role,
    name: u.name ?? null,
    surname: u.surname ?? null,
    birthDate: u.birthDate ?? null,
    consent: consentBool,
    // i campi parent non sono mostrati in UI, ma restano disponibili
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
  // Consenti modifica di: name, surname, birthDate, email
  const allow = ['name', 'surname', 'birthDate', 'email'];
  const patch = {};
  for (const k of allow) if (k in req.body) patch[k] = req.body[k];

  // Validazioni minime
  if (patch.name && String(patch.name).trim().length < 2) {
    return res.status(400).json({ message: 'Nome troppo corto.' });
  }
  if (patch.surname && String(patch.surname).trim().length < 2) {
    return res.status(400).json({ message: 'Cognome troppo corto.' });
  }
  if (patch.birthDate) {
    const d = new Date(patch.birthDate);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Data di nascita non valida.' });
    const today = new Date();
    if (d > today) return res.status(400).json({ message: 'La data di nascita non può essere futura.' });
  }

  // Email (opzionale): normalizza + univocità case-insensitive
  if (patch.email !== undefined) {
    const emailNorm = String(patch.email).trim().toLowerCase();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(emailNorm)) {
      return res.status(400).json({ message: 'Email non valida.' });
    }
    const duplicate = await User.findOne({ email: emailNorm, _id: { $ne: req.user.id } }).lean();
    if (duplicate) {
      return res.status(409).json({ message: 'Email già in uso.' });
    }
    patch.email = emailNorm;
  }

  const u = await User.findByIdAndUpdate(req.user.id, patch, { new: true })
    .select('email role name surname birthDate consent consents privacyConsent questionnaireDone');

  if (!u) return res.status(404).json({ message: 'Utente non trovato' });

  // Normalizzazione consenso per la risposta
  const consentRaw =
    u.consent ?? u.privacyConsent ?? (u.consents && u.consents.privacy);
  const consentBool = typeof consentRaw === 'boolean'
    ? consentRaw
    : (typeof consentRaw === 'string'
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

