// frontend/src/pages/Questionnaire.jsx
import { useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { submitQuestionnaire } from '../api/questionnaire';
import { useAuth } from '../context/AuthContext';

// Definisci qui le domande del tuo questionario
const questions = [
  { id: 'q1', text: 'Come ti senti oggi, su una scala da 1 a 10?' },
  { id: 'q2', text: "Descrivi il tuo umore prevalente nell'ultima settimana." },
  { id: 'q3', text: 'Quali sono le principali fonti di stress che stai affrontando?' },
  { id: 'q4', text: 'Ritieni di aver subito esperienze traumatiche?' },
  { id: 'q5', text: 'Hai difficoltà a dormire o noti cambiamenti nel tuo appetito?' },
  { id: 'q6', text: 'C’è qualcosa di specifico che vorresti discutere con il tuo terapeuta?' },
];

export default function Questionnaire() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth(); // per aggiornare questionnaireDone
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Se già completato → vai direttamente agli appuntamenti
  useEffect(() => {
    if (user && user.questionnaireDone) {
      navigate('/appointments', { replace: true });
    }
  }, [user, navigate]);

  const handleAnswerChange = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const allAnswered =
      Object.keys(answers).length === questions.length &&
      Object.values(answers).every(a => typeof a === 'string' && a.trim().length > 0);

    if (!allAnswered) {
      setError('Per favore, rispondi a tutte le domande.');
      setIsSubmitting(false);
      return;
    }

    const responses = questions.map(q => ({
      question: q.text,
      answer: answers[q.id].trim()
    }));

    try {
      await submitQuestionnaire({ responses });

      // marca l'utente come con questionario completato
      setUser(prev => (prev ? { ...prev, questionnaireDone: true } : prev));

      // fallback robusto per il "toast" in Appointments (oltre allo state del router)
      localStorage.setItem('pc_qc_toast', '1');

      // redirect agli appuntamenti + state per l'alert
      navigate('/appointments', {
        replace: true,
        state: { questionnaireJustCompleted: true }
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Errore nell'invio del questionario.");
      setIsSubmitting(false);
    }
  }

  // Render del form (se non hai già il redirect)
  return (
    <Box className="container" sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Questionario Conoscitivo</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <Typography sx={{ mb: 2 }}>
          Per favore, rispondi a queste domande per aiutarci a capire meglio la tua situazione.
        </Typography>

        <form onSubmit={onSubmit}>
          <Stack spacing={3}>
            {questions.map((q) => (
              <TextField
                key={q.id}
                label={q.text}
                multiline
                minRows={2}
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                required
                fullWidth
              />
            ))}

            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Invio in corso...' : 'Invia Questionario'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

