// frontend/src/pages/Appointments.jsx
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, IconButton, Paper, TextField, Typography,
  Snackbar, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createAppointment, listAppointments, cancelAppointment } from '../api/appointments';

const THERAPIST_ID = import.meta.env.VITE_THERAPIST_ID;
const THERAPIST_NAME = import.meta.env.VITE_THERAPIST_NAME || 'Il tuo terapeuta';

export default function Appointments() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Messaggio "grazie" post-questionario (gestione robusta: state + localStorage)
  const [showThanks, setShowThanks] = useState(false);

  // Snackbar di conferma azioni appuntamenti
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [items, setItems] = useState([]);
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Il questionario deve essere compilato per prenotare
  const questionnaireDone = user?.questionnaireDone;

  // Mostra "Grazie..." se arrivi dal questionario
  useEffect(() => {
    const fromState = location.state?.questionnaireJustCompleted === true;
    const fromStorage = localStorage.getItem('pc_qc_toast') === '1';

    if (fromState || fromStorage) {
      setShowThanks(true);
      localStorage.removeItem('pc_qc_toast');
      if (fromState) {
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location, navigate]);

  function showSnack(message, severity = 'success') {
    setSnack({ open: true, message, severity });
  }
  function closeSnack(_, reason) {
    if (reason === 'clickaway') return;
    setSnack(s => ({ ...s, open: false }));
  }

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
      showSnack('Appuntamento richiesto. In attesa di conferma.', 'success');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Errore creazione appuntamento.';
      setError(msg);
      showSnack(msg, 'error');
    } finally { setSubmitting(false); }
  }

  async function onCancel(id) {
    setError('');
    try {
      await cancelAppointment(id);
      await load();
      showSnack('Appuntamento cancellato.', 'success');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Errore cancellazione.';
      setError(msg);
      showSnack(msg, 'error');
    }
  }

  // Mappa colori delle Chip per stato
  function chipColorFor(statusRaw) {
    const s = (statusRaw || 'pending').toLowerCase();
    switch (s) {
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'rescheduled': return 'info';
      case 'cancelled':
      case 'canceled': return 'default';
      case 'pending':
      default: return 'warning';
    }
  }
  function prettyStatus(statusRaw) {
    const s = (statusRaw || 'pending').toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 720 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>I miei Appuntamenti</Typography>

      {showThanks && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Grazie per aver compilato il questionario! Ora puoi prenotare il tuo appuntamento.
        </Alert>
      )}

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
                {submitting ? 'Invio…' : 'Prenota'}
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
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Stato:&nbsp;
                <Chip
                  size="small"
                  color={chipColorFor(a.status)}
                  label={prettyStatus(a.status)}
                />
              </Typography>
            </div>
            {a.status === 'pending' && (
              <IconButton aria-label="Cancella" onClick={() => onCancel(a._id)}><DeleteIcon /></IconButton>
            )}
          </Paper>
        ))}
        {!loading && items.length === 0 && <Typography>Nessun appuntamento in programma.</Typography>}
      </div>

      {/* Snackbar conferme/errore */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={closeSnack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeSnack} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}





