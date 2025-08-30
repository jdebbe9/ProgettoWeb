import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Alert, Box, Button, IconButton, Paper, TextField, Typography,
  Snackbar, Chip, Grid, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createAppointment, listAppointments, cancelAppointment } from '../api/appointments';
import { getSlotsAvailability } from '../api/slots';
import { connectSocket } from '../realtime/socket';

const THERAPIST_NAME = import.meta.env.VITE_THERAPIST_NAME || 'Il tuo terapeuta';

function ymd(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function formatDT(d) {
  try { return new Date(d).toLocaleString('it-IT'); } catch { return '—'; }
}
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

export default function Appointments() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showThanks, setShowThanks] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  // slot state
  const [selectedDate, setSelectedDate] = useState(ymd(new Date()));
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState([]);

  const questionnaireDone = user?.questionnaireDone;
  const reloadTmrRef = useRef(null);
  const uid = user?._id || user?.id;

  const showSnack = (message, severity = 'success') =>
    setSnack({ open: true, message, severity });
  const closeSnack = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnack(s => ({ ...s, open: false }));
  };

  const fetchAppointments = useCallback(async () => {
    setError(''); setLoadingList(true);
    try {
      const data = await listAppointments();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore caricamento appuntamenti.');
    } finally { setLoadingList(false); }
  }, []);

  const loadSlots = useCallback(async (dateStr) => {
    setSlotsLoading(true);
    setError('');
    try {
      const data = await getSlotsAvailability(dateStr);
      setSlots(Array.isArray(data?.slots) ? data.slots : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore caricamento disponibilità.');
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  // prima fetch
  useEffect(() => { if (user) fetchAppointments(); }, [user, fetchAppointments]);
  useEffect(() => { if (user && selectedDate) loadSlots(selectedDate); }, [user, selectedDate, loadSlots]);

  // toast “grazie” post-questionario
  useEffect(() => {
    const fromState = location.state?.questionnaireJustCompleted === true;
    const fromStorage = localStorage.getItem('pc_qc_toast') === '1';
    if (fromState || fromStorage) {
      setShowThanks(true);
      localStorage.removeItem('pc_qc_toast');
      if (fromState) navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // realtime: ricarica liste/slot
  const reloadDebounced = useCallback(() => {
    if (reloadTmrRef.current) clearTimeout(reloadTmrRef.current);
    reloadTmrRef.current = setTimeout(() => {
      fetchAppointments();
      if (selectedDate) loadSlots(selectedDate);
    }, 200);
  }, [fetchAppointments, loadSlots, selectedDate]);

  useEffect(() => {
    if (!user) return;
    const s = connectSocket();
    if (uid) s.emit('join', String(uid));

    const onConnect = () => { fetchAppointments(); if (selectedDate) loadSlots(selectedDate); };
    s.on('connect', onConnect);
    s.on('reconnect', onConnect);

    s.on('appointment:created', reloadDebounced);
    s.on('appointment:updated', reloadDebounced);
    s.on('appointment:deleted', reloadDebounced);

    return () => {
      s.off('connect', onConnect);
      s.off('reconnect', onConnect);
      s.off('appointment:created', reloadDebounced);
      s.off('appointment:updated', reloadDebounced);
      s.off('appointment:deleted', reloadDebounced);
      if (reloadTmrRef.current) clearTimeout(reloadTmrRef.current);
    };
  }, [user, uid, fetchAppointments, loadSlots, selectedDate, reloadDebounced]);

  // regola: 1 solo appuntamento/giorno (consideriamo pending/accepted come “già impegnato”)
  const bookedDays = useMemo(() => {
    const set = new Set();
    for (const a of items) {
      const st = String(a.status || 'pending').toLowerCase();
      if (st === 'pending' || st === 'accepted' || st === 'rescheduled') {
        if (a.date) set.add(ymd(a.date));
      }
    }
    return set;
  }, [items]);

  async function handleBook(slot) {
    if (!questionnaireDone) {
      showSnack('Prima completa il questionario.', 'warning');
      return;
    }
    if (bookedDays.has(selectedDate)) {
      showSnack('Hai già una richiesta per questo giorno.', 'warning');
      return;
    }
    if (slot.busy || slot.isPast) return;

    try {
      await createAppointment({ date: slot.start }); // il backend risolve il terapeuta
      showSnack('Appuntamento richiesto. In attesa di conferma.', 'success');
      await fetchAppointments();
      await loadSlots(selectedDate);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Errore nella prenotazione';
      showSnack(msg, 'error');
    }
  }

  async function onCancel(id) {
    setError('');
    try {
      await cancelAppointment(id);
      await fetchAppointments();
      await loadSlots(selectedDate);
      showSnack('Appuntamento cancellato.', 'success');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Errore cancellazione.';
      setError(msg);
      showSnack(msg, 'error');
    }
  }

  // 👇 Non mostrare appuntamenti scaduti (accepted/rejected con data passata)
  const nowTs = Date.now();
  const visibleItems = items.filter((a) => {
    if (!a?.date) return true;
    const past = new Date(a.date).getTime() < nowTs;
    if (!past) return true;
    const s = String(a.status || 'pending').toLowerCase();
    return !(s === 'accepted' || s === 'rejected');
  });

  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 900 }}>
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
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                type="date"
                label="Giorno"
                InputLabelProps={{ shrink: true }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Typography variant="body2" sx={{ opacity: .8 }}>
                Terapeuta: <strong>{THERAPIST_NAME}</strong>
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Disponibilità</Typography>

              {slotsLoading ? (
                <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
                  <CircularProgress />
                </Box>
              ) : slots.length === 0 ? (
                <Alert severity="info">Nessuno slot disponibile in questo giorno.</Alert>
              ) : (
                <Grid container spacing={1}>
                  {slots.map((s) => {
                    const disabled =
                      s.isPast ||
                      s.busy ||
                      bookedDays.has(selectedDate);

                    const label = new Date(s.start).toLocaleTimeString('it-IT', {
                      hour: '2-digit', minute: '2-digit'
                    });

                    return (
                      <Grid item key={s.start}>
                        <Button
                          variant={s.busy ? 'outlined' : 'contained'}
                          color={s.busy ? 'inherit' : 'primary'}
                          disabled={disabled}
                          onClick={() => handleBook(s)}
                          sx={{ minWidth: 100 }}
                        >
                          {label}
                        </Button>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </>
        )}
      </Paper>

      <div className="stack">
        {visibleItems.map(a => (
          <Paper key={a._id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography>Data: {a.date ? formatDT(a.date) : '—'}</Typography>
              <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" component="span">Stato:</Typography>
                <Chip
                  size="small"
                  color={chipColorFor(a.status)}
                  label={prettyStatus(a.status)}
                />
              </Box>
            </div>
            {a.status === 'pending' && (
              <IconButton aria-label="Cancella" onClick={() => onCancel(a._id)}><DeleteIcon /></IconButton>
            )}
          </Paper>
        ))}
        {!loadingList && visibleItems.length === 0 && <Typography>Nessun appuntamento in programma.</Typography>}
      </div>

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









