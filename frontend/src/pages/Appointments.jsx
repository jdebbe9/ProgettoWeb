// frontend/src/pages/Appointments.jsx
import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createAppointment, listAppointments, cancelAppointment } from '../api/appointments';

const THERAPIST_ID = import.meta.env.VITE_THERAPIST_ID;
const THERAPIST_NAME = import.meta.env.VITE_THERAPIST_NAME || 'Il tuo terapeuta';

export default function Appointments() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Il questionario deve essere compilato per prenotare
  const questionnaireDone = user?.questionnaireDone;

  async function load() {
    setError(''); setLoading(true);
    try {
      const data = await listAppointments();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore caricamento appuntamenti.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function onCreate(e) {
    e.preventDefault();
    if (!questionnaireDone) return;
    setError(''); setSubmitting(true);
    try {
      await createAppointment({ date, therapistId: THERAPIST_ID });
      setDate('');
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore creazione appuntamento.');
    } finally { setSubmitting(false); }
  }

  async function onCancel(id) {
    setError('');
    try { await cancelAppointment(id); await load(); }
    catch (e) { setError(e?.response?.data?.message || 'Errore cancellazione.'); }
  }

  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 720 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>I miei Appuntamenti</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        {!questionnaireDone ? (
          <Alert severity="warning">
            Per prenotare un appuntamento, devi prima compilare il questionario iniziale.
            <Button component={Link} to="/questionnaire" sx={{ ml: 1 }}>Vai al questionario</Button>
          </Alert>
        ) : (
          <>
            <form className="row" onSubmit={onCreate}>
              <TextField
                type="datetime-local"
                label="Data e ora"
                InputLabelProps={{ shrink: true }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={!questionnaireDone}
              />
              <Button type="submit" variant="contained" disabled={submitting || !date || !questionnaireDone}>
                {submitting ? 'Invio…' : `Prenota`}
              </Button>
            </form>
            <Typography variant="body2" sx={{ mt: 1, opacity: .8 }}>
              Terapeuta: <strong>{THERAPIST_NAME}</strong>
            </Typography>
          </>
        )}
      </Paper>

      <div className="stack">
        {items.map(a => (
          <Paper key={a._id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography>Data: {a.date ? new Date(a.date).toLocaleString() : '—'}</Typography>
              <Typography variant="body2" sx={{ opacity: .8 }}>
                Stato: {a.status || 'pending'}
              </Typography>
            </div>
            {a.status === 'pending' && (
              <IconButton aria-label="Cancella" onClick={() => onCancel(a._id)}><DeleteIcon /></IconButton>
            )}
          </Paper>
        ))}
        {!loading && items.length === 0 && <Typography>Nessun appuntamento in programma.</Typography>}
      </div>
    </Box>
  );
}


