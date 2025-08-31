// frontend/src/pages/therapist/TherapistDashboard.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, Divider, Grid, Link, Paper, Stack, Typography, CircularProgress, Dialog, DialogTitle, DialogContent
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listAppointments } from '../../api/appointments';
import { getAllPatients, getPatientDetails } from '../../api/therapists';
import { connectSocket } from '../../realtime/socket';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23,59,59,999);
  return x;
}
function inRange(date, a, b) {
  const t = new Date(date).getTime();
  return t >= a.getTime() && t <= b.getTime();
}
function formatDT(d) {
  try { return new Date(d).toLocaleString('it-IT'); } catch { return '—'; }
}
function formatD(d) {
  try { return new Date(d).toLocaleDateString('it-IT', { weekday:'short', day:'2-digit', month:'2-digit' }); } catch { return '—'; }
}

export default function TherapistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTherapist = user?.role === 'therapist';

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients]         = useState([]);

  // Modal "scheda paziente" leggera
  const [openPatient, setOpenPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadData = useCallback(async () => {
    if (!isTherapist) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const [apps, patsRes] = await Promise.all([
        listAppointments(),
        getAllPatients()
      ]);
      setAppointments(Array.isArray(apps) ? apps : []);
      setPatients(Array.isArray(patsRes?.items) ? patsRes.items : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nel caricamento dei dati.');
    } finally {
      setLoading(false);
    }
  }, [isTherapist]);

  // realtime: aggiorna KPI/listini alla creazione/aggiornamento
  useEffect(() => {
    if (!isTherapist) return;
    const s = connectSocket();
    const reload = () => loadData();
    s.on('appointment:created', reload);
    s.on('appointment:updated', reload);
    s.on('appointment:removed', reload);
    s.on('appointment:deleted', reload);
    return () => {
      s.off('appointment:created', reload);
      s.off('appointment:updated', reload);
      s.off('appointment:removed', reload);
      s.off('appointment:deleted', reload);
    };
  }, [isTherapist, loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---- KPI derivati ----
  const now = new Date();
  const todayA = startOfDay(now);
  const todayB = endOfDay(now);
  const in7dA = startOfDay(now);
  const in7dB = endOfDay(new Date(now.getTime() + 6*24*60*60*1000)); // oggi + 6 -> 7 giorni

  const acceptedStatuses = new Set(['accepted', 'rescheduled']);
  const pendingCount = useMemo(
    () => appointments.filter(a => a.status === 'pending').length,
    [appointments]
  );
  const todayCount = useMemo(
    () => appointments.filter(a => acceptedStatuses.has(a.status) && inRange(a.date, todayA, todayB)).length,
    [appointments]
  );
  const activePatients90d = useMemo(() => {
    const since = new Date(now.getTime() - 90*24*60*60*1000);
    const ids = new Set(
      appointments
        .filter(a => acceptedStatuses.has(a.status) && new Date(a.date) >= since)
        .map(a => a.patient?._id || a.patient)
    );
    ids.delete(undefined);
    return ids.size;
  }, [appointments]);

  const recentPatients = useMemo(() => {
    const map = new Map();
    appointments
      .filter(a => acceptedStatuses.has(a.status))
      .sort((a,b) => new Date(b.date) - new Date(a.date))
      .forEach(a => {
        const p = a.patient;
        const id = p?._id || p;
        if (!map.has(id) && p) map.set(id, p);
      });
    return Array.from(map.values()).slice(0,5);
  }, [appointments]);

  // percentuale questionario completato fra i pazienti creati negli ultimi 30 gg
  const q30 = useMemo(() => {
    const since = new Date(now.getTime() - 30*24*60*60*1000);
    const recent = patients.filter(p => new Date(p.createdAt) >= since);
    const done = recent.filter(p => !!p.questionnaireDone);
    const pct = recent.length ? Math.round((done.length / recent.length) * 100) : 0;
    return { pct, done: done.length, total: recent.length };
  }, [patients]);

  const upcoming7 = useMemo(() => {
    return appointments
      .filter(a => acceptedStatuses.has(a.status) && inRange(a.date, in7dA, in7dB))
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8);
  }, [appointments]);

  // Banners
  const banners = useMemo(() => {
    const items = [];
    if (pendingCount > 0) {
      items.push({
        key: 'pending',
        title: `Hai ${pendingCount} richieste di appuntamento in attesa`,
        actionLabel: 'Rivedi nell’Agenda',
        onClick: () => navigate('/therapist/schedule'),
      });
    }
    if (upcoming7.length === 0) {
      items.push({
        key: 'availability',
        title: 'Non hai appuntamenti nei prossimi 7 giorni',
        actionLabel: 'Aggiungi disponibilità',
        onClick: () => navigate('/therapist/schedule'),
      });
    }
    return items;
  }, [pendingCount, upcoming7, navigate]);

  // Apertura scheda paziente (modal leggera)
  const openPatientCard = async (p) => {
    setOpenPatient(p);
    setPatientDetails(null);
    setLoadingDetails(true);
    try {
      const data = await getPatientDetails(p._id);
      setPatientDetails(data);
    } catch  {
      // noop
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Dashboard Terapeuta</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {/* KPI */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EventIcon />
                  <Typography variant="subtitle2">Appuntamenti oggi</Typography>
                </Stack>
                <Typography variant="h4" sx={{ mt: 1 }}>{todayCount}</Typography>
                <Link component={RouterLink} to="/therapist/schedule" underline="hover">
                  Vai all’Agenda
                </Link>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <HourglassEmptyIcon />
                  <Typography variant="subtitle2">Richieste in attesa</Typography>
                </Stack>
                <Typography variant="h4" sx={{ mt: 1 }}>{pendingCount}</Typography>
                <Link component={RouterLink} to="/therapist/schedule" underline="hover">
                  Rivedi richieste
                </Link>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PeopleIcon />
                  <Typography variant="subtitle2">Pazienti attivi (90 gg)</Typography>
                </Stack>
                <Typography variant="h4" sx={{ mt: 1 }}>{activePatients90d}</Typography>
                <Typography variant="body2" color="text.secondary">Visite confermate</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AssignmentTurnedInIcon />
                  <Typography variant="subtitle2">Questionari (ultimi 30 gg)</Typography>
                </Stack>
                <Typography variant="h4" sx={{ mt: 1 }}>{q30.pct}%</Typography>
                <Typography variant="body2" color="text.secondary">{q30.done}/{q30.total} completati</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Centro azioni */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/therapist/schedule')}>
                Rivedi richieste in attesa
              </Button>
              <Button variant="outlined" onClick={() => navigate('/therapist/schedule')}>
                Aggiungi disponibilità
              </Button>
            </Stack>
          </Paper>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Prossimi 7 giorni */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Prossimi 7 giorni</Typography>
                {upcoming7.length === 0 ? (
                  <Typography color="text.secondary">Nessun appuntamento programmato.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {upcoming7.map(a => (
                      <Paper key={a._id} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <div>
                            <Typography fontWeight="bold">{formatDT(a.date)}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {a.patient?.name} {a.patient?.surname} — {a.patient?.email}
                            </Typography>
                          </div>
                          <Chip size="small" label={a.status} />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* Pazienti recenti */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Pazienti recenti</Typography>
                {recentPatients.length === 0 ? (
                  <Typography color="text.secondary">Nessun paziente recente.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {recentPatients.map(p => (
                      <Paper key={p._id} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <div>
                            <Typography fontWeight="bold">{p.name} {p.surname}</Typography>
                            <Typography variant="body2" color="text.secondary">{p.email}</Typography>
                          </div>
                          <Button size="small" onClick={() => openPatientCard(p)}>Apri scheda</Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Banners */}
          {banners.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                {banners.map(b => (
                  <Grid item xs={12} md={6} key={b.key}>
                    <Paper variant="outlined" sx={{ p: 2, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <Typography>{b.title}</Typography>
                      <Button variant="text" onClick={b.onClick}>{b.actionLabel}</Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      )}

      {/* Modal scheda paziente (lettura veloce) */}
      <Dialog open={!!openPatient} onClose={() => setOpenPatient(null)} fullWidth maxWidth="md">
        <DialogTitle>Scheda paziente — {openPatient ? `${openPatient.name} ${openPatient.surname}` : ''}</DialogTitle>
        <DialogContent dividers>
          {loadingDetails && <CircularProgress />}
          {!loadingDetails && !patientDetails && <Alert severity="error">Impossibile caricare i dettagli.</Alert>}
          {!loadingDetails && patientDetails && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2">Anagrafica</Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: {patientDetails.user?.email} — Nato/a: {patientDetails.user?.birthDate ? formatD(patientDetails.user.birthDate) : '—'}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Ultime voci di diario</Typography>
                {patientDetails.diary?.length ? (
                  <Stack spacing={1}>
                    {patientDetails.diary.slice(0,3).map(e => (
                      <Paper key={e._id} variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{formatDT(e.createdAt)}</Typography>
                        <Typography sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{e.content}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                ) : <Typography color="text.secondary">Nessuna voce presente.</Typography>}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Questionario</Typography>
                {patientDetails.questionnaire ? (
                  <Typography variant="body2" color="text.secondary">Compilato il {formatDT(patientDetails.questionnaire.createdAt)}</Typography>
                ) : (
                  <Typography color="text.secondary">Non ancora compilato.</Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}






