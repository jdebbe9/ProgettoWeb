// controllers/questionnaireController.js
const QuestionnaireResponse = require('../models/QuestionnaireResponse');
const User = require('../models/User');
const { notifyTherapist, getDisplayName } = require('../services/notify');



function sanitizeResponses(raw) {
  if (!Array.isArray(raw)) return null;

  const MAX_Q = 100;       
  const MAX_QL = 200;      
  const MAX_AL = 2000;     

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


exports.submitQuestionnaire = async (req, res) => {
  try {
   
    if (req.user?.role === 'therapist') {
      return res.status(403).json({ message: 'Solo i pazienti possono inviare il questionario' });
    }

    
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

    
    await User.findByIdAndUpdate(req.user.id, { questionnaireDone: true });

    
    try {
      const patientName = await getDisplayName(req.user.id);
      await notifyTherapist({
        type: 'QUESTIONNAIRE_COMPLETED',
        title: 'Questionario completato',
        body: `${patientName} ha completato il questionario iniziale.`,
        data: { patientId: req.user.id, questionnaireId: response._id }
      });
    } catch (notifyErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[questionnaire:submit] notifyTherapist failed:', notifyErr?.message);
      }
      
    }

    return res.status(201).json({
      id: response._id,
      message: 'Questionario salvato',
    });
  } catch (err) {
    console.error('Errore invio questionario:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

exports.getMyQuestionnaire = async (req, res) => {
  try {
    const response = await QuestionnaireResponse
      .findOne({ user: req.user.id })
      .select('-__v -user'); 

    if (!response) return res.status(404).json({ message: 'Nessun questionario trovato' });
    return res.json(response);
  } catch (err) {
    console.error('Errore lettura questionario:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};


