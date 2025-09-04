// frontend/src/pages/therapist/ScheduleRequests.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, Paper, Stack, TextField, Typography, Checkbox, FormControlLabel,
  IconButton, Tooltip, Divider
} from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import { listAppointments, updateAppointment } from '../../api/appointments';
import { connectSocket } from '../../realtime/socket';
import { useAuth } from '../../context/AuthContext';
import ScheduleTabs from '../../components/ScheduleTabs';
import { Link as RouterLink } from 'react-router-dom';
import { getSlotsAvailability } from '../../api/slots';

const SLOT_HOURS = [8, 9, 10, 11, 12, 15, 16, 17, 18, 19]; // slot 1h
const WEEK_DAYS = 5; // Lun–Ven

function formatDT(d) {
  try { return new Date(d).toLocaleString('it-IT'); } catch { return '—'; }
}
function ymd(date) {
  const dd = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dd.getFullYear()}-${pad(dd.getMonth()+1)}-${pad(dd.getDate())}`;
}
function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0..6 (0=dom)
  const diff = (day === 0 ? -6 : 1 - day);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function safeDate(v){ const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }

export default function ScheduleRequests() {
  const { user } = useAuth();
  const isTherapist = user?.role === 'therapist';

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [items, setItems]     = useState([]);

  const [busyId, setBusyId]   = useState(null);

  // Dialog accetta (modalità online + link)
  const [acceptId, setAcceptId] = useState(null);
  const [acceptIsOnline, setAcceptIsOnline] = useState(false);
  const [acceptVideoLink, setAcceptVideoLink] = useState('');

  // Dialog rifiuto
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Dialog riprogramma a SLOT
  const [reschedAppt, setReschedAppt] = useState(null);
  const [reschedWeekStart, setReschedWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const reschedDays = useMemo(() => Array.from({ length: WEEK_DAYS }, (_, i) => addDays(reschedWeekStart, i)), [reschedWeekStart]);
  const [reschedAvail, setReschedAvail] = useState({});
  const [reschedLoading, setReschedLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isTherapist) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const all = await listAppointments();
      const pending = (Array.isArray(all) ? all : []).filter(a => a.status === 'pending')
        .sort((a,b) => new Date(a.date) - new Date(b.date));
      setItems(pending);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nel caricamento delle richieste.');
    } finally {
      setLoading(false);
    }
  }, [isTherapist]);

  useEffect(() => {
    load();
    if (!isTherapist) return;
    const s = connectSocket();
    const reload = () => load();
    s.on('appointment:created', reload);
    s.on('appointment:updated', reload);
    s.on('appointment:removed', reload);
    return () => {
      s.off('appointment:created', reload);
      s.off('appointment:updated', reload);
      s.off('appointment:removed', reload);
    };
  }, [isTherapist, load]);

  // --------- Azioni ---------
  const openAccept = (appt) => {
    setAcceptId(appt._id);
    setAcceptIsOnline(!!appt.requestedOnline); // predefinito sulla preferenza del paziente
    setAcceptVideoLink('');
  };
  const handleAccept = async () => {
    if (!acceptId) return;
    setBusyId(acceptId);
    try {
      await updateAppointment(acceptId, {
        status: 'accepted',
        isOnline: acceptIsOnline,
        videoLink: acceptIsOnline ? acceptVideoLink.trim() : '',
      });
      setAcceptId(null);
      setAcceptIsOnline(false);
      setAcceptVideoLink('');
      await load();
    } catch {/* noop */} finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setBusyId(rejectId);
    try {
      await updateAppointment(rejectId, { status: 'rejected', reason: rejectReason || undefined });
      await load();
    } catch  {/* noop */} finally {
      setBusyId(null);
      setRejectId(null);
      setRejectReason('');
    }
  };

  const openReschedule = (appt) => {
    setReschedAppt(appt);
    setReschedWeekStart(startOfWeekMonday(new Date(appt.date || Date.now())));
  };
  const closeReschedule = () => {
    setReschedAppt(null);
    setReschedAvail({});
  };

  const loadReschedAvail = useCallback(async () => {
    setReschedLoading(true);
    try {
      const results = await Promise.all(
        reschedDays.map(d => getSlotsAvailability(ymd(d)).catch(() => ({ date: ymd(d), slots: [] })))
      );
      const map = {};
      for (const r of results) map[r.date] = Array.isArray(r.slots) ? r.slots : [];
      setReschedAvail(map);
    } finally {
      setReschedLoading(false);
    }
  }, [reschedDays]);

  const chooseReschedSlot = async (slot) => {
    if (!reschedAppt || !slot?.start) return;
    setBusyId(reschedAppt._id);
    try {
      // cambi solo la data; lo stato può rimanere "pending" (o "rescheduled" se preferisci lato backend)
      await updateAppointment(reschedAppt._id, { date: slot.start, status: 'rescheduled' });
      closeReschedule();
      await load();
    } catch  {
      // noop
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => { if (reschedAppt) loadReschedAvail(); }, [reschedAppt, reschedWeekStart, loadReschedAvail]);

  const empty = useMemo(() => !loading && items.length === 0, [loading, items]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>Agenda — Richieste in attesa</Typography>
      <ScheduleTabs />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <CircularProgress />}

      {!loading && empty && (
        <Alert severity="info">Nessuna richiesta pendente. Vai al <RouterLink to="/therapist/schedule">Calendario</RouterLink>.</Alert>
      )}

      <Grid container spacing={2}>
        {items.map(a => (
          <Grid item xs={12} key={a._id}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                <div>
                  <Typography fontWeight="bold">{formatDT(a.date)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a.patient?.name} {a.patient?.surname} — {a.patient?.email}
                  </Typography>
                  {typeof a.requestedOnline === 'boolean' && (
                    <Chip
                      size="small"
                      sx={{ mt: 0.5 }}
                      variant="outlined"
                      color={a.requestedOnline ? 'info' : 'default'}
                      label={`Preferenza paziente: ${a.requestedOnline ? 'ONLINE' : 'IN STUDIO'}`}
                    />
                  )}
                </div>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={a.status} />
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busyId === a._id}
                    onClick={() => openAccept(a)}
                  >Accetta</Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busyId === a._id}
                    onClick={() => openReschedule(a)}
                    startIcon={<EditCalendarIcon fontSize="small" />}
                  >Riprogramma</Button>
                  <Button
                    size="small"
                    color="error"
                    disabled={busyId === a._id}
                    onClick={() => setRejectId(a._id)}
                  >Rifiuta</Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Dialog ACCETTA: modalità online + link */}
      <Dialog open={!!acceptId} onClose={() => setAcceptId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Accetta appuntamento</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={<Checkbox checked={acceptIsOnline} onChange={(e) => setAcceptIsOnline(e.target.checked)} />}
              label="Visita online"
            />
            <TextField
              label="Link Google Meet / Teams"
              placeholder="https://meet.google.com/..."
              value={acceptVideoLink}
              onChange={(e) => setAcceptVideoLink(e.target.value)}
              disabled={!acceptIsOnline}
              fullWidth
            />
            <Alert severity="info">Se selezioni "Visita online", il paziente vedrà un link cliccabile nel suo calendario.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcceptId(null)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={handleAccept}
            disabled={busyId === acceptId || (acceptIsOnline && !acceptVideoLink.trim())}
          >
            Conferma
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog RIFIUTO */}
      <Dialog open={!!rejectId} onClose={() => setRejectId(null)}>
        <DialogTitle>Rifiuta richiesta</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Motivo (opzionale)"
            fullWidth
            margin="dense"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectId(null)}>Annulla</Button>
          <Button color="error" onClick={handleReject} disabled={busyId === rejectId}>Rifiuta</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog RIPROGRAMMA a slot */}
      <Dialog open={!!reschedAppt} onClose={closeReschedule} fullWidth maxWidth="md">
        <DialogTitle>Riprogramma appuntamento</DialogTitle>
        <DialogContent dividers>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Tooltip title="Settimana precedente">
                <IconButton onClick={() => setReschedWeekStart(addDays(reschedWeekStart, -7))}><ChevronLeft /></IconButton>
              </Tooltip>
              <Tooltip title="Settimana successiva">
                <IconButton onClick={() => setReschedWeekStart(addDays(reschedWeekStart, +7))}><ChevronRight /></IconButton>
              </Tooltip>
              <Tooltip title="Questa settimana">
                <IconButton onClick={() => setReschedWeekStart(startOfWeekMonday(new Date()))}><TodayIcon /></IconButton>
              </Tooltip>
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                Seleziona uno slot libero
              </Typography>
            </Stack>
            {reschedAppt && (
              <Chip
                size="small"
                label={`${reschedAppt?.patient?.name || ''} ${reschedAppt?.patient?.surname || ''} • ${formatDT(reschedAppt.date)}`}
              />
            )}
          </Stack>

          <Divider sx={{ mb: 1 }} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '120px repeat(5, 1fr)',
              alignItems: 'stretch',
              px: 1,
            }}
          >
            {/* header giorni */}
            <Box />
            {reschedDays.map((d) => (
              <Box key={ymd(d)} sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="subtitle2">
                  {d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </Typography>
              </Box>
            ))}

            {reschedLoading ? (
              <Box sx={{ gridColumn: '1 / -1', py: 4, display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
              </Box>
            ) : (
              SLOT_HOURS.map((h) => (
                <ReschedRow
                  key={h}
                  hour={h}
                  days={reschedDays}
                  avail={reschedAvail}
                  onPick={chooseReschedSlot}
                />
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReschedule}>Chiudi</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ReschedRow({ hour, days, avail, onPick }) {
  const label = `${String(hour).padStart(2, '0')}:00`;

  return (
    <>
      {/* colonna orario */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1 }}>
        <Typography variant="body2">{label}</Typography>
      </Box>

      {days.map((d) => {
        const dateStr = ymd(d);
        const slots = avail[dateStr] || [];
        const slot = slots.find(s => {
          const ds = safeDate(s.start);
          return ds && ds.getHours() === hour;
        });

        const isFree = slot && !slot.busy && !slot.isPast;

        return (
          <Box key={`${dateStr}-${hour}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {slot ? (
              <Button
                size="small"
                variant={isFree ? 'outlined' : 'text'}
                disabled={!isFree}
                onClick={() => isFree && onPick(slot)}
                sx={{ height: 40, minWidth: 88 }}
              >
                {isFree ? 'Scegli' : '—'}
              </Button>
            ) : (
              <Typography variant="body2" sx={{ opacity: 0.6 }}>—</Typography>
            )}
          </Box>
        );
      })}
    </>
  );
}
