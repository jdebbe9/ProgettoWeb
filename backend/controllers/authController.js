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
  name: u.name, // Aggiunto
  email: u.email,
  role: u.role,
  questionnaireDone: u.questionnaireDone
});

// Controllers --------------------------------------------

// POST /api/auth/register
exports.register = async (req, res) => {
  // Aggiunti name, surname, birthDate
  const { name, surname, birthDate, email, password, role, consent } = req.body;

  if (!email || !password || !name || !surname || !birthDate || consent !== true) {
    return res.status(400).json({ message: 'Tutti i campi e il consenso sono obbligatori' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Email non valida' });
  if (password.length < 6) return res.status(400).json({ message: 'Password troppo corta (min 6)' });

  const finalRole = role === 'therapist' ? 'therapist' : 'patient';

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email già registrata' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      surname,
      birthDate,
      email,
      passwordHash,
      role: finalRole,
      consentGivenAt: new Date(),
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
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email e password richieste' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Credenziali non valide' });

    const ok = await bcrypt.compare(password, user.passwordHash);
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
    const user = await User.findById(payload.userId);
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
      const user = await User.findById(userId);
      if (user) {
        user.refreshTokenHash = undefined;
        await user.save();
      }
    } catch {/* token rotto: niente panico, proseguiamo */}
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  return res.json({ message: 'Logout effettuato' });
};

// GET /api/auth/me
exports.me = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Non autenticato' });
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -refreshTokenHash');
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};
