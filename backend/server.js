// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/authMiddleware');
const { initSocket } = require('./realtime/socket'); // ⬅️ realtime

// MODEL per seed terapeuta
const User = require('./models/User');

// ROUTES
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const diaryRoutes = require('./routes/diaryRoutes');
const questionnaireRoutes = require('./routes/questionnaireRoutes');
const therapistRoutes = require('./routes/therapistRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const slotRoutes = require('./routes/slotRoutes');

const app = express();
const server = http.createServer(app); // ⬅️ necessario per socket.io

// Sicurezza & parsing
app.use(helmet());

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Static uploads (firme/allegati)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ status: 'OK' }));

// Mount endpoints
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/therapists', therapistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/slots', slotRoutes);

// 404 ed errori centralizzati
app.use(notFound);
app.use(errorHandler);

/* ----------------------- SEED TERAPEUTA UNICO ----------------------- */
async function ensureTherapistAccount() {
  try {
    const email = process.env.THERAPIST_EMAIL;
    const password = process.env.THERAPIST_PASSWORD;
    const name = process.env.THERAPIST_NAME || 'Terapeuta';
    const surname = process.env.THERAPIST_SURNAME || 'Unico';
    const birthDate = process.env.THERAPIST_BIRTHDATE || '1980-01-01';

    if (!email || !password) {
      console.warn(
        '[seed] THERAPIST_EMAIL/THERAPIST_PASSWORD non impostati. Seed terapeuta saltato.'
      );
      return;
    }

    let user = await User.findOne({ email });
    const hash = await bcrypt.hash(password, 10);

    if (!user) {
      user = await User.create({
        name,
        surname,
        birthDate: new Date(birthDate),
        email,
        role: 'therapist',
        approved: true,

        // password hash (compatibile con schemi che usano passwordHash o password)
        passwordHash: hash,
        password: hash,

        privacyConsent: true,
        consentGivenAt: new Date(),
      });
      console.log(`[seed] Creato account terapeuta: ${email}  id=${user._id}`);
    } else {
      let changed = false;

      if (user.role !== 'therapist') {
        user.role = 'therapist';
        changed = true;
      }
      if (user.approved !== true) {
        user.approved = true;
        changed = true;
      }

      if (!user.name) {
        user.name = name;
        changed = true;
      }
      if (!user.surname) {
        user.surname = surname;
        changed = true;
      }
      if (!user.birthDate) {
        user.birthDate = new Date(birthDate);
        changed = true;
      }
      if (!user.consentGivenAt) {
        user.consentGivenAt = new Date();
        changed = true;
      }
      if (user.privacyConsent !== true) {
        user.privacyConsent = true;
        changed = true;
      }

      // aggiorna password se differente
      let same = false;
      try {
        same = await bcrypt.compare(
          password,
          user.passwordHash || user.password || ''
        );
      } catch {
        same = false;
      }
      if (!same) {
        user.passwordHash = hash;
        try {
          user.password = hash;
        } catch {}
        changed = true;
      }

      if (changed) {
        await user.save();
        console.log(
          `[seed] Aggiornato account terapeuta: ${email}  id=${user._id}`
        );
      } else {
        console.log(
          `[seed] Account terapeuta già allineato: ${email}  id=${user._id}`
        );
      }
    }

    console.log(
      `[seed] Usa questo id nel frontend (.env se serve): VITE_THERAPIST_ID=${user._id}`
    );
  } catch (e) {
    console.error('[seed] Errore seed terapeuta:', e);
  }
}
/* ------------------------------------------------------------------- */

// Avvio
(async () => {
  try {
    await connectDB();
    await ensureTherapistAccount();
    const PORT = process.env.PORT || 5000;

    const server = http.createServer(app);   // ⬅️ usa http server
    initSocket(server);                      // ⬅️ inizializza socket.io
    server.listen(PORT, () =>
      console.log(`🚀 Server avviato su http://localhost:${PORT}`)
    );
  } catch (err) {
    process.exit(1);
  }
})();




