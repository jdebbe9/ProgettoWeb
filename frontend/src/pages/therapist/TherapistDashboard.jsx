// frontend/src/pages/therapist/TherapistDashboard.jsx
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, TextField, Typography, CircularProgress
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../context/AuthContext';
import { listAppointments, updateAppointment } from '../../api/appointments';
import { getAllPatients, getPatientDetails } from '../../api/therapists';
import { connectSocket } from '../../realtime/socket';

function formatDT(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('it-IT'); }
  catch { return 'Data non valida'; }
}

export default function TherapistDashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const [patientDetails, setPatientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [modalContent, setModalContent] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ open: false, id: null, date: '' });

  // debounce per ricarichi ravvicinati
  const reloadTmrRef = useRef(null);

  const loadData = useCallback(async () => {
    if (user?.role !== 'therapist') return;
    setLoading(true);
    setError('');
    try {
      const [patientsRes, appointmentsRes] = await Promise.all([
        getAllPatients(),
        listAppointments()
      ]);
      setPatients(patientsRes?.items || []);
      setAppointments(Array.isArray(appointmentsRes) ? appointmentsRes : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nel caricamento dei dati.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  const reloadDebounced = useCallback(() => {
    if (reloadTmrRef.current) clearTimeout(reloadTmrRef.current);
    reloadTmrRef.current = setTimeout(() => {
      loadData();
    }, 200);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: join stanza utente + ricarico liste a eventi
  useEffect(() => {
    const s = connectSocket(); // singleton; riusa la connessione se già aperta

    // entra nella room del terapeuta per ricevere eventi mirati
    const uid = user?.id || user?._id;
    if (uid) s.emit('join', String(uid));

    const onConnect = () => loadData();

    s.on('connect', onConnect);
    s.on('reconnect', onConnect);

    s.on('appointment:created', reloadDebounced);
    s.on('appointment:updated', reloadDebounced);
    s.on('appointment:removed', reloadDebounced);
    // compat vecchio nome evento
    s.on('appointment:deleted', reloadDebounced);

    return () => {
      s.off('connect', onConnect);
      s.off('reconnect', onConnect);
      s.off('appointment:created', reloadDebounced);
      s.off('appointment:updated', reloadDebounced);
      s.off('appointment:removed', reloadDebounced);
      s.off('appointment:deleted', reloadDebounced);
      if (reloadTmrRef.current) clearTimeout(reloadTmrRef.current);
    };
  }, [user, loadData, reloadDebounced]);

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientDetails(null);
      return;
    }
    const loadDetails = async () => {
      setLoadingDetails(true);
      setError('');
      try {
        const data = await getPatientDetails(selectedPatientId);
        setPatientDetails(data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Errore nel caricamento dei dettagli.');
      } finally {
        setLoadingDetails(false);
      }
    };
    loadDetails();
  }, [selectedPatientId]);

  const handleUpdateAppointment = async (id, payload) => {
    try {
      await updateAppointment(id, payload);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Errore durante l\'aggiornamento.');
    }
  };

  // Rifiuta senza popup
  const handleRejectAppointment = async (id) => {
    setError('');
    try {
      await updateAppointment(id, { status: 'rejected' });
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Errore durante il rifiuto.');
    }
  };

  const openRescheduleDialog = (id, date) => {
    const dt = new Date(date || Date.now());
    const pad = (n) => String(n).padStart(2, '0');
    const dateString = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setRescheduleData({ open: true, id, date: dateString });
  };

  const confirmReschedule = () => {
    if (rescheduleData.id && rescheduleData.date) {
      handleUpdateAppointment(rescheduleData.id, { date: rescheduleData.date });
    }
    setRescheduleData({ open: false, id: null, date: '' });
  };

  const filteredPatients = useMemo(
    () =>
      patients.filter((p) =>
        (p.name?.toLowerCase() + ' ' + p.surname?.toLowerCase()).includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [patients, searchTerm]
  );

  const pendingAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'pending'),
    [appointments]
  );

  const patientName = patientDetails?.user?.name
    ? `${patientDetails.user.name} ${patientDetails.user.surname}`
    : (patientDetails?.user?.email || '...');

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 980 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Dashboard Terapeuta</Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Pazienti</Typography>
        <TextField
          fullWidth
          label="Cerca paziente..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ my: 2 }}
        />
        <Stack spacing={1} sx={{ maxHeight: 300, overflowY: 'auto', p: 0.5 }}>
          {filteredPatients.length > 0 ? (
            filteredPatients.map((p) => (
              <Paper
                key={p._id}
                variant="outlined"
                onClick={() => setSelectedPatientId(p._id)}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  borderColor: selectedPatientId === p._id ? 'primary.main' : 'divider',
                }}
              >
                <Typography fontWeight="bold">
                  {p.name} {p.surname}
                </Typography>
                <Typography variant="body2">{p.email}</Typography>
              </Paper>
            ))
          ) : (
            <Typography>Nessun paziente trovato.</Typography>
          )}
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Diario Paziente
          </Typography>
          <Button
            variant="outlined"
            disabled={!selectedPatientId || loadingDetails}
            onClick={() => setModalContent('diary')}
          >
            {loadingDetails ? <CircularProgress size={24} /> : `Vedi diario`}
          </Button>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Questionario
          </Typography>
          <Button
            variant="outlined"
            disabled={!selectedPatientId || loadingDetails}
            onClick={() => setModalContent('questionnaire')}
          >
            {loadingDetails ? <CircularProgress size={24} /> : `Vedi questionario`}
          </Button>
        </Paper>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Appuntamenti in attesa
        </Typography>
        <Stack spacing={1.5}>
          {pendingAppointments.length > 0 ? (
            pendingAppointments.map((a) => (
              <Paper
                key={a._id}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {a.patient?.name}
                  </Typography>
                  <Typography variant="body2">Data: {formatDT(a.date)}</Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    onClick={() => handleUpdateAppointment(a._id, { status: 'accepted' })}
                    color="success"
                    title="Accetta"
                  >
                    <CheckIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => openRescheduleDialog(a._id, a.date)}
                    title="Modifica"
                  >
                    <EditIcon />
                  </IconButton>
                  {/* Rifiuta senza conferma */}
                  <IconButton
                    onClick={() => handleRejectAppointment(a._id)}
                    color="error"
                    title="Rifiuta"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Paper>
            ))
          ) : (
            <Typography>Nessun appuntamento in attesa.</Typography>
          )}
        </Stack>
      </Paper>

      <Dialog
        open={!!modalContent}
        onClose={() => setModalContent(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {modalContent === 'diary' ? 'Diario – ' : 'Questionario – '} {patientName}
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetails ? (
            <CircularProgress />
          ) : (
            <>
              {modalContent === 'diary' && (
                patientDetails?.diary?.length > 0 ? (
                  <Stack spacing={2}>
                    {patientDetails.diary.map((e) => (
                      <Paper key={e._id} variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="caption">{formatDT(e.createdAt)}</Typography>
                        <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                          {e.content}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography>Nessuna voce nel diario.</Typography>
                )
              )}
              {modalContent === 'questionnaire' && (
                patientDetails?.questionnaire?.responses?.length > 0 ? (
                  <Stack spacing={2}>
                    {patientDetails.questionnaire.responses.map((r, i) => (
                      <div key={i}>
                        <Typography fontWeight="bold">{r.question}</Typography>
                        <Typography sx={{ whiteSpace: 'pre-wrap', pl: 1 }}>{r.answer}</Typography>
                      </div>
                    ))}
                  </Stack>
                ) : (
                  <Typography>Il paziente non ha ancora compilato il questionario.</Typography>
                )
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalContent(null)}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rescheduleData.open}
        onClose={() => setRescheduleData({ ...rescheduleData, open: false })}
      >
        <DialogTitle>Riprogramma appuntamento</DialogTitle>
        <DialogContent>
          <TextField
            type="datetime-local"
            label="Nuova data e ora"
            InputLabelProps={{ shrink: true }}
            value={rescheduleData.date}
            onChange={(e) =>
              setRescheduleData({ ...rescheduleData, date: e.target.value })
            }
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRescheduleData({ open: false, id: null, date: '' })}>
            Annulla
          </Button>
          <Button onClick={confirmReschedule} variant="contained">
            Salva
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}




