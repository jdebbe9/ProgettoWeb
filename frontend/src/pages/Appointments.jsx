import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import { createAppointment, listAppointments, cancelAppointment } from '../api/appointments';

const THERAPIST_ID = import.meta.env.VITE_THERAPIST_ID;
const THERAPIST_NAME = import.meta.env.VITE_THERAPIST_NAME || 'Il tuo terapeuta';

export default function Appointments() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    if (!authLoading && user) load();
  }, [authLoading, user]);

  async function onCreate(e) {
    e.preventDefault();
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
      <Typography variant="h5" sx={{ mb: 2 }}>Appuntamenti</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <form className="row" onSubmit={onCreate}>
          <TextField
            type="datetime-local"
            label="Data e ora"
            InputLabelProps={{ shrink: true }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" disabled={submitting || !date}>
            {submitting ? 'Creo…' : `Prenota con ${THERAPIST_NAME}`}
          </Button>
        </form>
        <Typography variant="body2" sx={{ mt: 1, opacity: .8 }}>
          Terapeuta: <strong>{THERAPIST_NAME}</strong>
        </Typography>
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
            <IconButton aria-label="Cancella" onClick={() => onCancel(a._id)}><DeleteIcon /></IconButton>
          </Paper>
        ))}
        {!loading && items.length === 0 && <Typography>Nessun appuntamento.</Typography>}
      </div>
    </Box>
  );
}


