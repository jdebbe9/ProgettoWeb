// frontend/src/pages/therapist/ScheduleRequests.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, Paper, Stack, TextField, Typography
} from '@mui/material';
import { listAppointments, updateAppointment } from '../../api/appointments';
import { connectSocket } from '../../realtime/socket';
import { useAuth } from '../../context/AuthContext';
import ScheduleTabs from '../../components/ScheduleTabs';
import { Link as RouterLink } from 'react-router-dom';

function formatDT(d) {
  try { return new Date(d).toLocaleString('it-IT'); } catch { return '—'; }
}
function ymdLocal(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleRequests() {
  const { user } = useAuth();
  const isTherapist = user?.role === 'therapist';

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [items, setItems]     = useState([]);

  const [busyId, setBusyId]   = useState(null);

  // Dialog rifiuto
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Dialog riprogramma
  const [reschedId, setReschedId] = useState(null);
  const [reschedWhen, setReschedWhen] = useState(ymdLocal(new Date()));

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

  const handleAccept = async (id) => {
    setBusyId(id);
    try {
      await updateAppointment(id, { status: 'accepted' });
      await load();
    } catch {/* noop */}
    setBusyId(null);
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setBusyId(rejectId);
    try {
      // il backend può ignorare/accettare "reason"; status basta
      await updateAppointment(rejectId, { status: 'rejected', reason: rejectReason || undefined });
      await load();
    } catch  {/* noop */}
    setBusyId(null);
    setRejectId(null);
    setRejectReason('');
  };

  const handleReschedule = async () => {
    if (!reschedId || !reschedWhen) return;
    setBusyId(reschedId);
    try {
      const iso = new Date(reschedWhen).toISOString();
      await updateAppointment(reschedId, { status: 'rescheduled', date: iso });
      await load();
    } catch  {/* noop */}
    setBusyId(null);
    setReschedId(null);
  };

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
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <div>
                  <Typography fontWeight="bold">{formatDT(a.date)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a.patient?.name} {a.patient?.surname} — {a.patient?.email}
                  </Typography>
                </div>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={a.status} />
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busyId === a._id}
                    onClick={() => handleAccept(a._id)}
                  >Accetta</Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busyId === a._id}
                    onClick={() => setReschedId(a._id)}
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

      {/* Dialog rifiuto */}
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

      {/* Dialog riprogramma */}
      <Dialog open={!!reschedId} onClose={() => setReschedId(null)}>
        <DialogTitle>Riprogramma appuntamento</DialogTitle>
        <DialogContent>
          <TextField
            label="Data & ora"
            type="datetime-local"
            fullWidth
            margin="dense"
            value={reschedWhen}
            onChange={(e) => setReschedWhen(e.target.value)}
            inputProps={{ step: 60 * 60 }} // 60 min
          />
          <Typography variant="caption" color="text.secondary">
            Slot da 60 minuti — lun–ven 08–13 & 15–20
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReschedId(null)}>Annulla</Button>
          <Button variant="contained" onClick={handleReschedule} disabled={busyId === reschedId}>Salva</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
