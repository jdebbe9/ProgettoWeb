// frontend/src/pages/Questionnaire.jsx
import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography, Stack } from '@mui/material';
import { submitQuestionnaire } from '../api/questionnaire';
import { useAuth } from '../context/AuthContext';

// Definisci qui le domande del tuo questionario
const questions = [
  { id: 'q1', text: 'Come ti senti oggi, su una scala da 1 a 10?' },
  { id: 'q2', text: 'Descrivi il tuo umore prevalente nell\'ultima settimana.' },
  { id: 'q3', text: 'Quali sono le principali fonti di stress che stai affrontando?' },
  { id: 'q4', text: 'Ritieni di aver subito esperienze traumatiche?' },
  { id: 'q5', text: 'Hai difficoltà a dormire o noti cambiamenti nel tuo appetito?' },
  { id: 'q6', text: 'C\'è qualcosa di specifico che vorresti discutere con il tuo terapeuta?' },
];

export default function Questionnaire() {
  const { user, setUser } = useAuth(); // Per aggiornare lo stato `questionnaireDone`
  const [answers, setAnswers] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswerChange = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    setIsSubmitting(true);

    if (Object.keys(answers).length !== questions.length || Object.values(answers).some(a => !a.trim())) {
      setError('Per favore, rispondi a tutte le domande.');
      setIsSubmitting(false);
      return;
    }

    const responses = questions.map(q => ({
      question: q.text,
      answer: answers[q.id]
    }));

    try {
      await submitQuestionnaire({ responses });
      setMsg('Questionario inviato con successo! ✅');
      setUser({ ...user, questionnaireDone: true });
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nell\'invio del questionario.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (user?.questionnaireDone) {
    return (
      <Box className="container" sx={{ mt: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Questionario</Typography>
        <Alert severity="success">Hai già completato e inviato il questionario. Grazie!</Alert>
      </Box>
    );
  }

  return (
    <Box className="container" sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Questionario Conoscitivo</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 3 }}>
        <Typography sx={{ mb: 2 }}>Per favore, rispondi a queste domande per aiutarci a capire meglio la tua situazione.</Typography>
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