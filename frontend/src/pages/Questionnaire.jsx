// frontend/src/pages/Questionnaire.jsx
import { useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { submitQuestionnaire } from '../api/questionnaire';
import { useAuth } from '../context/AuthContext';


const questions = [
  {
    id: 'q1',
    text: 'Ritengo di aver subito traumi dalla mia vita? Quali? E da parte di chi?',
    minRows: 4,
  },
  {
    id: 'q2',
    text:
      'Elenco di tutte le mie preoccupazioni ed elenco di tutto ciò che mi manda in depressione (nel presente, passato e futuro)',
    minRows: 5,
  },
  {
    id: 'q3',
    text: 'Come vivo la mia sessualità? Ho fatto esperienze particolari? Quali?',
    minRows: 4,
  },
  {
    id: 'q4',
    text:
      'Elenco dei conflitti con la mia famiglia di origine. Con chi in particolare hai più conflitti?',
    minRows: 4,
  },
  {
    id: 'q5',
    text: 'Elenco degli obiettivi che vorrei raggiungere venendo in psicoterapia',
    minRows: 4,
  },
  {
    id: 'q6',
    text: 'Elenco di tutte le mie passioni',
    minRows: 3,
  },
];

export default function Questionnaire() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


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
      answer: (answers[q.id] || '').trim(),
    }));

    try {
      await submitQuestionnaire({ responses });

  
      setUser(prev => (prev ? { ...prev, questionnaireDone: true } : prev));

    
      localStorage.setItem('pc_qc_toast', '1');

    
      navigate('/appointments', {
        replace: true,
        state: { questionnaireJustCompleted: true },
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Errore nell'invio del questionario.");
      setIsSubmitting(false);
    }
  }

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
                minRows={q.minRows ?? 2}
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
