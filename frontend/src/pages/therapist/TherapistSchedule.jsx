// src/pages/therapist/TherapistSchedule.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Paper, Typography, IconButton, Stack, Tooltip, Divider
} from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import { listAppointments, updateAppointment } from '../../api/appointments';
import { connectSocket } from '../../realtime/socket';
import ScheduleTabs from '../../components/ScheduleTabs';

const SLOT_HOURS = [8, 9, 10, 11, 12, 15, 16, 17, 18, 19]; // 1h per slot
const WEEK_DAYS = 5; // Lun–Ven

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
function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function slotKey(dayDate, hour) {
  return `${ymd(dayDate)}T${String(hour).padStart(2, '0')}:00`;
}
function italianDateRangeLabel(monday, friday) {
  const fmt = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt.format(monday)} — ${fmt.format(friday)}`;
}
function fullNameOrEmail(p) {
  const name = [p?.name, p?.surname].filter(Boolean).join(' ').trim();
  return name || p?.email || 'Paziente';
}

// Stato visivo cella
function statusToCell(stateRaw) {
  if (!stateRaw) return 'free';
  const s = String(stateRaw).toLowerCase();
  if (s === 'accepted') return 'accepted';
  if (s === 'pending' || s === 'rescheduled') return 'pending';
  if (s === 'rejected' || s === 'cancelled' || s === 'canceled') return 'free'; // nascosti
  return 'free';
}

export default function TherapistSchedule() {
  const { user } = useAuth();
  const isTherapist = user?.role === 'therapist';
  const uid = user?._id || user?.id;

  const [baseDate, setBaseDate] = useState(() => startOfWeekMonday(new Date()));
  const monday = useMemo(() => startOfWeekMonday(baseDate), [baseDate]);
  const friday = useMemo(() => addDays(monday, 4), [monday]);
  const days = useMemo(() => Array.from({ length: WEEK_DAYS }, (_, i) => addDays(monday, i)), [monday]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const reloadTmrRef = useRef(null);

  const loadAppointments = useCallback(async () => {
    if (!isTherapist) return;
    setLoading(true);
    try {
      const data = await listAppointments();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[schedule] listAppointments failed', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isTherapist]);

  // accept/reject azioni inline
  const handleAccept = async (id) => {
    if (!id) return;
    setActionBusy(true);
    try {
      await updateAppointment(id, { status: 'accepted' });
      await loadAppointments();
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[schedule] accept failed', e);
    } finally {
      setActionBusy(false);
    }
  };
  const handleReject = async (id) => {
    if (!id) return;
    setActionBusy(true);
    try {
      await updateAppointment(id, { status: 'rejected' });
      await loadAppointments();
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[schedule] reject failed', e);
    } finally {
      setActionBusy(false);
    }
  };

  // socket
  useEffect(() => {
    if (!isTherapist) return;
    const s = connectSocket();
    if (uid) s.emit('join', String(uid));

    const debounced = () => {
      if (reloadTmrRef.current) clearTimeout(reloadTmrRef.current);
      reloadTmrRef.current = setTimeout(() => { loadAppointments(); }, 200);
    };

    s.on('connect', loadAppointments);
    s.on('reconnect', loadAppointments);
    s.on('appointment:created', debounced);
    s.on('appointment:updated', debounced);
    s.on('appointment:deleted', debounced);

    return () => {
      s.off('connect', loadAppointments);
      s.off('reconnect', loadAppointments);
      s.off('appointment:created', debounced);
      s.off('appointment:updated', debounced);
      s.off('appointment:deleted', debounced);
      if (reloadTmrRef.current) clearTimeout(reloadTmrRef.current);
    };
  }, [isTherapist, uid, loadAppointments]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // indicizza per slot (ignora rejected/cancelled)
  const slotMap = useMemo(() => {
    const map = new Map();
    const rank = (st) => {
      const s = String(st || '').toLowerCase();
      if (s === 'accepted') return 2;
      if (s === 'pending' || s === 'rescheduled') return 1;
      return 0;
    };
    for (const a of items) {
      if (!a?.date) continue;
      const s = String(a.status || '').toLowerCase();
      if (s === 'rejected' || s === 'cancelled' || s === 'canceled') continue; // nascondi
      const d = new Date(a.date);
      const h = d.getHours();
      if (!SLOT_HOURS.includes(h)) continue;
      const key = slotKey(d, h);
      const prev = map.get(key);
      if (!prev || rank(a.status) > rank(prev.status)) map.set(key, a);
    }
    return map;
  }, [items]);

  const goPrevWeek = () => setBaseDate(addDays(monday, -7));
  const goNextWeek = () => setBaseDate(addDays(monday, 7));
  const goThisWeek = () => setBaseDate(startOfWeekMonday(new Date()));

  if (!isTherapist) {
    return (
      <Box className="container" sx={{ mt: 3, maxWidth: 1100 }}>
        <Typography variant="h6">Accesso negato</Typography>
        <Typography variant="body2">Solo i terapeuti possono visualizzare l’agenda.</Typography>
      </Box>
    );
  }

  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 1100 }}>
      {/* ⬇️ Aggiunta: Tab Calendario / Richieste / Disponibilità */}
      <ScheduleTabs />

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title="Settimana precedente">
            <IconButton onClick={goPrevWeek}><ChevronLeft /></IconButton>
          </Tooltip>
          <Tooltip title="Settimana successiva">
            <IconButton onClick={goNextWeek}><ChevronRight /></IconButton>
          </Tooltip>
          <Tooltip title="Oggi (settimana corrente)">
            <IconButton onClick={goThisWeek}><TodayIcon /></IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ ml: 1 }}>
            Agenda • {italianDateRangeLabel(monday, friday)}
          </Typography>
        </Stack>

        {/* Legenda */}
        <Stack direction="row" spacing={1} alignItems="center">
          <LegendDot sx={{ bgcolor: 'success.main' }} /> <Typography component="span" variant="body2">Accettato</Typography>
          <LegendDot sx={{ bgcolor: 'warning.main' }} /> <Typography component="span" variant="body2">In attesa</Typography>
          <LegendDot sx={{ bgcolor: 'action.disabledBackground' }} /> <Typography component="span" variant="body2">Libero</Typography>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        {/* Header giorni */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '120px repeat(5, 1fr)',
            alignItems: 'stretch',
            mb: 1,
            px: 1,
          }}
        >
          <Box />
          {days.map((d) => (
            <Box key={ymd(d)} sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle2">
                {d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 1 }} />

        {/* Griglia slot */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '120px repeat(5, 1fr)',
            rowGap: 1,
            columnGap: 1,
            alignItems: 'stretch',
            px: 1,
          }}
        >
          {SLOT_HOURS.map((h) => (
            <SlotRow
              key={h}
              hour={h}
              days={days}
              slotMap={slotMap}
              loading={loading}
              actionBusy={actionBusy}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

function SlotRow({ hour, days, slotMap, loading, actionBusy, onAccept, onReject }) {
  const label = `${String(hour).padStart(2, '0')}:00`;

  return (
    <>
      {/* colonna orario */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1 }}>
        <Typography variant="body2">{label}</Typography>
      </Box>

      {days.map((d) => {
        const key = slotKey(d, hour);
        const appt = slotMap.get(key);
        const cellState = statusToCell(appt?.status); // 'accepted' | 'pending' | 'free'

        // Stili per stato
        const stateSx =
          cellState === 'accepted'
            ? { bgcolor: 'success.main', color: 'success.contrastText', borderColor: 'success.dark' }
            : cellState === 'pending'
            ? { bgcolor: 'warning.main', color: 'warning.contrastText', borderColor: 'warning.dark' }
            : // free → bianco
              { color: 'text.primary', borderColor: 'divider' };

        return (
          <Paper
            key={key}
            variant="outlined"
            sx={{
              p: 1,
              minHeight: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              ...stateSx,
            }}
          >
            {loading ? (
              <Typography variant="caption" component="span" sx={{ opacity: 0.8 }}>Caricamento…</Typography>
            ) : appt && cellState !== 'free' ? (
              <>
                <Stack spacing={0.25} sx={{ overflow: 'hidden' }}>
                  <Typography variant="body2" component="span" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {label} • {prettyStatus(appt.status)}
                  </Typography>
                  <Typography variant="caption" component="span" noWrap title={fullNameOrEmail(appt.patient)}>
                    {fullNameOrEmail(appt.patient)}
                  </Typography>
                </Stack>

                {String(appt.status).toLowerCase() === 'pending' && (
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Accetta">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => onAccept(appt._id)}
                          disabled={actionBusy}
                          sx={{ color: 'inherit' }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Rifiuta">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => onReject(appt._id)}
                          disabled={actionBusy}
                          sx={{ color: 'inherit' }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                )}
              </>
            ) : (
              <Typography variant="body2" component="span" sx={{ opacity: 0.9 }}>
                {label} • Libero
              </Typography>
            )}
          </Paper>
        );
      })}
    </>
  );
}

function prettyStatus(statusRaw) {
  const s = String(statusRaw || '').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function LegendDot({ sx }) {
  return <Box sx={{ width: 12, height: 12, borderRadius: '50%', ...sx }} />;
}


