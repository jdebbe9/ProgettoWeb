// controllers/questionnaireController.js
const QuestionnaireResponse = require('../models/QuestionnaireResponse');
const User = require('../models/User');

// Helpers -------------------------------------------------
function sanitizeResponses(raw) {
  if (!Array.isArray(raw)) return null;

  const MAX_Q = 100;       // max numero di domande
  const MAX_QL = 200;      // max chars domanda
  const MAX_AL = 2000;     // max chars risposta

  if (raw.length === 0 || raw.length > MAX_Q) return null;

  const cleaned = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;

    const q = (item.question ?? '').toString().trim();
    const a = (item.answer ?? '').toString().trim();

    if (!q || !a) return null;
    if (q.length > MAX_QL || a.length > MAX_AL) return null;

    cleaned.push({ question: q, answer: a });
  }
  return cleaned;
}

// POST /api/questionnaire
exports.submitQuestionnaire = async (req, res) => {
  try {
    // (Opzionale) Solo i pazienti possono inviare il questionario
    if (req.user?.role === 'therapist') {
      return res.status(403).json({ message: 'Solo i pazienti possono inviare il questionario' });
    }

    // Evita doppio invio
    const already = await QuestionnaireResponse.findOne({ user: req.user.id });
    if (already) return res.status(409).json({ message: 'Questionario già inviato' });

    const cleaned = sanitizeResponses(req.body?.responses);
    if (!cleaned) {
      return res.status(400).json({ message: 'Formato risposte non valido' });
    }

    const response = await QuestionnaireResponse.create({
      user: req.user.id,
      responses: cleaned,
    });

    // Aggiorna flag utente (utile per la UI)
    await User.findByIdAndUpdate(req.user.id, { questionnaireDone: true });

    return res.status(201).json({
      id: response._id,
      message: 'Questionario salvato',
    });
  } catch (err) {
    console.error('Errore invio questionario:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

// GET /api/questionnaire/me
exports.getMyQuestionnaire = async (req, res) => {
  try {
    const response = await QuestionnaireResponse
      .findOne({ user: req.user.id })
      .select('-__v -user'); // opzionale: non esporre campi inutili

    if (!response) return res.status(404).json({ message: 'Nessun questionario trovato' });
    return res.json(response);
  } catch (err) {
    console.error('Errore lettura questionario:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};
