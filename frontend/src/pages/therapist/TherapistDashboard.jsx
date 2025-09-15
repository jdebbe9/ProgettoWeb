// frontend/src/pages/therapist/TherapistDashboard.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert, Box, Button, Divider, Paper, Stack,
  Typography, CircularProgress, TextField, IconButton,
  Select, MenuItem, FormControl, InputLabel, LinearProgress, Chip
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { listAppointments } from '../../api/appointments';
import { getAllPatients } from '../../api/therapists';
import { connectSocket } from '../../realtime/socket';

/* -------------------- helpers -------------------- */
const ACCEPTED = new Set(['accepted', 'rescheduled']);
const NEGATIVE = new Set(['cancelled', 'rejected']);

/** === UI TUNING (modifica qui per personalizzare) === */
const LAYOUT = {
  // KPI
  kpiIconBox: 44,
  kpiIconSize: 22,
  kpiMinHeight: 120,

  // Attività recente
  activity: {
    maxVisible: 3,       // dopo 3 eventi scorre
    rowApproxHeight: 68, // evento compatto ma leggibile
    listGap: 1,
    itemPadding: 0.75,   // se presente nel sx degli item
  },

  // Promemoria (altezza “pari” ad Attività ~320px)
  reminders: {
    buttonSize: 'small',
    fieldSize: 'medium',
    inputMinRows: 2.1,
    panelMinHeight: 285,
    panelMaxHeight: 285, // fisso -> combacia visivamente con Attività
  },
};

/* ==================================================== */

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function inRange(date, a, b) { const t = new Date(date).getTime(); return t >= a.getTime() && t <= b.getTime(); }
function fmtDT(d) { try { return new Date(d).toLocaleString('it-IT'); } catch { return '—'; } }
function fullName(p) { return `${p?.name || ''} ${p?.surname || ''}`.trim(); }

/* ======================= LOGICA STATISTICHE (hook) ======================= */
function useStatistics(appointments, patients) {
  const [statPeriod, setStatPeriod] = useState('30'); // '7' | '30' | '90' | 'ytd'

  const { from, to } = useMemo(() => {
    const now = new Date();
    const end = endOfDay(now);
    if (statPeriod === '7' || statPeriod === '30' || statPeriod === '90') {
      const days = parseInt(statPeriod, 10);
      const start = startOfDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
      return { from: start, to: end };
    }
    // YTD
    const yStart = startOfDay(new Date(now.getFullYear(), 0, 1));
    return { from: yStart, to: end };
  }, [statPeriod]);

  const inPeriodApps = useMemo(
    () => (appointments || []).filter(a => inRange(a.date, from, to)),
    [appointments, from, to]
  );

  const stats = useMemo(() => {
    const total = inPeriodApps.length;
    const conf = inPeriodApps.filter(a => ACCEPTED.has(a.status)).length;
    const neg  = inPeriodApps.filter(a => NEGATIVE.has(a.status)).length;

    const newPts = (patients || []).filter(p => inRange(p.createdAt, from, to)).length;

    // Questionari basati sui pazienti creati nel periodo
    const periodPatients = (patients || []).filter(p => inRange(p.createdAt, from, to));
    const qDone = periodPatients.filter(p => !!p.questionnaireDone).length;
    const qTot  = periodPatients.length;

    return {
      appsTotal: total,
      confirmRate: total ? Math.round((conf / total) * 100) : 0,
      cancelRate: total ? Math.round((neg  / total) * 100) : 0,
      newPatients: newPts,
      qDone, qTotal: qTot, qPct: qTot ? Math.round((qDone / qTot) * 100) : 0,
      missingQ: periodPatients.filter(p => !p.questionnaireDone),
    };
  }, [inPeriodApps, patients, from, to]);

  // Trend settimanale (bucket lun-dom dentro il periodo)
  const trendWeekly = useMemo(() => {
    const buckets = [];
    const start = new Date(from);
    const end   = new Date(to);

    // allinea start al lunedì
    const day = start.getDay(); // 0=dom
    const offsetToMon = (day === 0 ? -6 : 1 - day);
    start.setDate(start.getDate() + offsetToMon);
    start.setHours(0,0,0,0);

    // settimane fino a "to"
    let cur = new Date(start);
    while (cur <= end) {
      const weekStart = new Date(cur);
      const weekEnd   = endOfDay(new Date(weekStart.getTime() + 6*24*60*60*1000));
      buckets.push({ a: weekStart, b: weekEnd });
      cur = new Date(weekEnd.getTime() + 1);
    }

    const series = buckets.map(({a,b}) => {
      const count = inPeriodApps.filter(x => ACCEPTED.has(x.status) && inRange(x.date, a, b)).length;
      const label = `${a.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit' })}–${b.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit' })}`;
      return { label, count };
    });

    const max = Math.max(1, ...series.map(s => s.count));
    return series.map(s => ({ ...s, pct: Math.round((s.count / max) * 100) }));
  }, [inPeriodApps, from, to]);

  // (lasciamo qui eventuali altri calcoli, anche se non usati)
  const slowRequests = useMemo(() => {
    const now = Date.now();
    return (appointments || [])
      .filter(a => a.status === 'pending')
      .filter(a => now - new Date(a.createdAt || a.date).getTime() > 48*60*60*1000);
  }, [appointments]);

  return { statPeriod, setStatPeriod, stats, trendWeekly, slowRequests };
}
/* ======================================================================= */

/* -------------------- component -------------------- */
export default function TherapistDashboard() {
  const { user } = useAuth();
  const isTherapist = user?.role === 'therapist';

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients]         = useState([]);

  // Promemoria (localStorage per terapeuta corrente)
  const storageKey = `pcare:reminders:${user?._id || 'me'}`;
  const [notes, setNotes]     = useState([]);
  const [newNote, setNewNote] = useState('');

  const loadData = useCallback(async () => {
    if (!isTherapist) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [apps, patsRes] = await Promise.all([ listAppointments(), getAllPatients() ]);
      setAppointments(Array.isArray(apps) ? apps : []);
      setPatients(Array.isArray(patsRes?.items) ? patsRes.items : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nel caricamento dei dati.');
    } finally {
      setLoading(false);
    }
  }, [isTherapist]);

  useEffect(() => { loadData(); }, [loadData]);

  // realtime: refresh leggero
  useEffect(() => {
    if (!isTherapist) return;
    const s = connectSocket();
    const reload = () => loadData();
    s.on('appointment:created', reload);
    s.on('appointment:updated', reload);
    s.on('appointment:deleted', reload);
    s.on('appointment:removed', reload);
    return () => {
      s.off('appointment:created', reload);
      s.off('appointment:updated', reload);
      s.off('appointment:deleted', reload);
      s.off('appointment:removed', reload);
    };
  }, [isTherapist, loadData]);

  // Promemoria: load/save
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setNotes(raw ? JSON.parse(raw) : []);
    } catch {
      setNotes([]);
    }
  }, [storageKey]);

  const saveNotes = (arr) => {
    setNotes(arr);
    try { localStorage.setItem(storageKey, JSON.stringify(arr)); } catch {/* */}
  };
  const addNote = () => {
    const t = (newNote || '').trim();
    if (!t) return;
    const n = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`, text: t, createdAt: new Date().toISOString() };
    saveNotes([n, ...notes]); setNewNote('');
  };
  const delNote = (id) => saveNotes(notes.filter(n => n.id !== id));

  /* --------- derivazioni --------- */
  const todayCount = useMemo(() => {
    const now = new Date();
    const a = startOfDay(now), b = endOfDay(now);
    return appointments.filter(x => ACCEPTED.has(x.status) && inRange(x.date, a, b)).length;
  }, [appointments]);

  const pendingCount = useMemo(
    () => appointments.filter(a => a.status === 'pending').length,
    [appointments]
  );

  const activePatients90d = useMemo(() => {
    const since = new Date(Date.now() - 90*24*60*60*1000);
    const ids = new Set(
      appointments.filter(a => ACCEPTED.has(a.status) && new Date(a.date) >= since)
                  .map(a => a.patient?._id || a.patient)
    );
    ids.delete(undefined);
    return ids.size;
  }, [appointments]);

  const q30 = useMemo(() => {
    const since = new Date(Date.now() - 30*24*60*60*1000);
    const recent = patients.filter(p => new Date(p.createdAt) >= since);
    const done = recent.filter(p => !!p.questionnaireDone);
    return { done: done.length, total: recent.length, pct: recent.length ? Math.round((done.length / recent.length) * 100) : 0 };
  }, [patients]);

  const activityList = useMemo(() => {
    return (appointments || [])
      .filter(a => a.status !== 'pending')
      .map(a => ({
        when: new Date(a.updatedAt || a.date || 0).getTime(),
        title:
          a.status === 'accepted' ? 'Appuntamento confermato'
          : a.status === 'rescheduled' ? 'Appuntamento riprogrammato'
          : a.status === 'rejected' ? 'Appuntamento rifiutato'
          : a.status === 'cancelled' ? 'Appuntamento annullato'
          : `Stato: ${a.status}`,
        subtitle: `${fullName(a.patient)} — ${fmtDT(a.date)}`
      }))
      .sort((x,y)=> y.when - x.when);
  }, [appointments]);

  /* ---- STATISTICHE: stato/calcoli ---- */
  // 👉 tolgo dallo use le parti che non useremo in UI
  const { statPeriod, setStatPeriod, stats, trendWeekly } =
    useStatistics(appointments, patients);

  /* -------------------- UI -------------------- */
  // Card KPI (icone e testo allineati, supporta Icon o icon)
  const StatCard = ({ Icon, icon, title, value, sub, to }) => {
    const iconNode = Icon ? <Icon sx={{ fontSize: LAYOUT.kpiIconSize }} /> : icon || null;
    return (
      <Paper variant="outlined" sx={{ p: 2, height: '100%', minHeight: LAYOUT.kpiMinHeight }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `${LAYOUT.kpiIconBox}px 1fr auto`, alignItems: 'center', columnGap: 2 }}>
          <Box sx={{
            width: LAYOUT.kpiIconBox, height: LAYOUT.kpiIconBox, borderRadius: 2,
            bgcolor: 'primary.light', color: 'primary.contrastText', display: 'grid', placeItems: 'center'
          }} aria-hidden>
            {iconNode}
          </Box>

          {/* Blocco testuale centrato verticalmente */}
          <Box sx={{ minWidth: 0, display: 'grid', alignContent: 'center', rowGap: 0.25 }}>
            <Typography variant="overline" color="text.secondary" noWrap>{title}</Typography>
            <Typography variant="h5" sx={{ lineHeight: 1.2 }}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>

          {to && <Button size="small" component={RouterLink} to={to} sx={{ alignSelf: 'start' }}>Apri</Button>}
        </Box>
      </Paper>
    );
  };

  // Altezza massima scroll Attività = 3 eventi compatti
  const activityMaxHeight = useMemo(() => {
    const { maxVisible, rowApproxHeight, listGap } = LAYOUT.activity;
    return maxVisible * rowApproxHeight + (maxVisible - 1) * listGap;
  }, []);

  /* -------------------- RENDER -------------------- */
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>Dashboard</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? <CircularProgress /> : (
        <>
          {/* KPI: due per riga su >= sm */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, // sempre 2↔2 per riga
              gap: 2,
              alignItems: 'stretch',
              mb: 2,
            }}
          >
            <StatCard Icon={EventAvailableIcon} title="Appuntamenti di oggi" value={todayCount} to="/therapist/schedule" />
            <StatCard Icon={HourglassEmptyIcon} title="Richieste in attesa" value={pendingCount} to="/therapist/schedule/requests" />
            <StatCard Icon={PeopleIcon} title="Pazienti attivi" value={activePatients90d} to="/therapist/patients" />
            <StatCard Icon={AssignmentTurnedInIcon} title="Questionari (ultimi 30 giorni)" value={`${q30.pct}% completati`} to="/therapist/patients" />
          </Box>

          {/* Layout principale: 2 colonne uguali */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 2fr' }, gap: 2, alignItems: 'start' }}>
            {/* Colonna sinistra: Attività recente */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Attività recente</Typography>
              <Divider sx={{ my: 1 }} />

              {activityList.length === 0 ? (
                <Typography color="text.secondary">Nessuna attività recente.</Typography>
              ) : (
                <Box
                  sx={{
                    maxHeight: activityMaxHeight,
                    overflowY: 'auto',
                    pr: 1,
                    // Scrollbar chiara, sottile
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.18)',
                      borderRadius: 8,
                    },
                    '&:hover::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.28)' },
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(0,0,0,0.18) transparent',
                  }}
                >
                  <Stack spacing={LAYOUT.activity.listGap}>
                    {activityList.map((ev, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: LAYOUT.activity.itemPadding }}>
                        <Typography fontWeight="bold">{ev.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{ev.subtitle}</Typography>
                        <Typography variant="caption" color="text.secondary">{fmtDT(ev.when)}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>

            {/* Colonna destra: Promemoria */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                height: '100%',
                minHeight: LAYOUT.reminders.panelMinHeight || undefined,
                maxHeight: LAYOUT.reminders.panelMaxHeight || undefined,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography variant="subtitle1">Promemoria</Typography>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                  value={newNote}
                  onChange={(e)=>setNewNote(e.target.value)}
                  placeholder="Aggiungi una nota"
                  size={LAYOUT.reminders.fieldSize}
                  fullWidth
                  multiline
                  minRows={LAYOUT.reminders.inputMinRows}
                />
                {/* Bottone identico a "APRI" */}
                <Button
                  variant="text"
                  size="small"
                  onClick={addNote}
                  sx={{ alignSelf: 'flex-start', whiteSpace: 'nowrap' }}
                >
                  AGGIUNGI
                </Button>
              </Stack>

              {notes.length === 0 ? (
                <Typography color="text.secondary">Nessun promemoria salvato.</Typography>
              ) : (
                <Box
                  sx={{
                    overflowY: 'auto',
                    // Scrollbar identica ad "Attività recente"
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.18)',
                      borderRadius: 8,
                    },
                    '&:hover::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.28)' },
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(0,0,0,0.18) transparent',
                  }}
                >
                  <Stack spacing={1}>
                    {notes.map(n => (
                      <Paper key={n.id} variant="outlined" sx={{ p: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <div>
                            <Typography sx={{ whiteSpace:'pre-wrap' }}>{n.text}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {fmtDT(n.createdAt)}
                            </Typography>
                          </div>
                          <IconButton size="small" onClick={()=>delNote(n.id)} aria-label="Elimina">
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>
          </Box>

          {/* ======================= SEZIONE STATISTICHE ======================= */}
          <Box sx={{ mt: 3 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1}>
                <Typography variant="h6">Statistiche</Typography>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="stat-period-label">Periodo</InputLabel>
                  <Select
                    labelId="stat-period-label"
                    label="Periodo"
                    value={statPeriod}
                    onChange={(e)=>setStatPeriod(e.target.value)}
                  >
                    <MenuItem value="7">Ultimi 7 giorni</MenuItem>
                    <MenuItem value="30">Ultimi 30 giorni</MenuItem>
                    <MenuItem value="90">Ultimi 90 giorni</MenuItem>
                    <MenuItem value="ytd">Anno in corso</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              {/* KPI Statistiche */}
              <Box
                sx={{
                  mt: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
                  gap: 1.5,
                }}
              >
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Appuntamenti</Typography>
                  <Typography variant="h6">{stats.appsTotal}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Tasso conferma</Typography>
                  <Typography variant="h6">{stats.confirmRate}%</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Cancellati / No-show</Typography>
                  <Typography variant="h6">{stats.cancelRate}%</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Nuovi pazienti</Typography>
                  <Typography variant="h6">{stats.newPatients}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Questionari</Typography>
                  <Typography variant="h6">{stats.qDone}/{stats.qTotal} <Chip size="small" label={`${stats.qPct}%`} sx={{ ml: .5 }} /></Typography>
                </Paper>
              </Box>

              {/* Trend settimanale (barre) */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: .5 }}>Trend settimanale (appuntamenti confermati)</Typography>
                <Stack spacing={0.75}>
                  {trendWeekly.map((w, i) => (
                    <Box key={i}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: .25 }}>
                        <Typography variant="caption" color="text.secondary">{w.label}</Typography>
                        <Typography variant="caption">{w.count}</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={w.pct} />
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Paper>
          </Box>
          {/* ===================== /SEZIONE STATISTICHE ===================== */}
        </>
      )}
    </Box>
  );
}
