// src/pages/therapist/TherapistSchedule.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Paper, Typography, IconButton, Stack, Tooltip, Divider,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress, Chip
} from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LaptopMacIcon from '@mui/icons-material/LaptopMac'; 
import { useAuth } from '../../context/AuthContext';
import { listAppointments, updateAppointment } from '../../api/appointments';
import { connectSocket } from '../../realtime/socket';
import ScheduleTabs from '../../components/ScheduleTabs';
import { getSlotsAvailability } from '../../api/slots';

const SLOT_HOURS = [8, 9, 10, 11, 12, 15, 16, 17, 18, 19];
const WEEK_DAYS = 5; 

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); 
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
function safeDate(v){ const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }


function statusToCell(stateRaw) {
  if (!stateRaw) return 'free';
  const s = String(stateRaw).toLowerCase();
  if (s === 'accepted') return 'accepted';
  if (s === 'pending' || s === 'rescheduled') return 'pending';
  if (s === 'rejected' || s === 'cancelled' || s === 'canceled') return 'free';
  return 'free';
}

function statusToLabel(stateRaw) {
  const s = String(stateRaw || '').toLowerCase();
  switch (s) {
    case 'accepted': return 'Accettato';
    case 'pending': return 'In attesa';
    case 'rescheduled': return 'Ripianificato';
    case 'cancelled':
    case 'canceled': return 'Annullato';
    case 'rejected': return 'Rifiutato';
    default: return '—';
  }
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

 
  const [joinDialog, setJoinDialog] = useState({ open: false, link: '' });
  const openJoinDialog = (link) => setJoinDialog({ open: true, link });
  const closeJoinDialog = () => setJoinDialog({ open: false, link: '' });
  const confirmJoin = () => {
    const link = joinDialog.link;
    closeJoinDialog();
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
  };

  const [reschedAppt, setReschedAppt] = useState(null);
  const [reschedWeekStart, setReschedWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const reschedDays = useMemo(() => Array.from({ length: WEEK_DAYS }, (_, i) => addDays(reschedWeekStart, i)), [reschedWeekStart]);
  const [reschedAvail, setReschedAvail] = useState({});
  const [reschedLoading, setReschedLoading] = useState(false);

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

  const openReschedule = (appt) => {
    if (!appt) return;
    setReschedAppt(appt);
    setReschedWeekStart(startOfWeekMonday(new Date(appt.date || Date.now())));
  };

  const closeReschedule = () => {
    setReschedAppt(null);
    setReschedAvail({});
  };

  const chooseReschedSlot = async (slot) => {
    if (!reschedAppt || !slot?.start) return;
    setActionBusy(true);
    try {
      await updateAppointment(reschedAppt._id, { date: slot.start });
      closeReschedule();
      await loadAppointments();
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[schedule] reschedule failed', e);
    } finally {
      setActionBusy(false);
    }
  };


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
  useEffect(() => { if (reschedAppt) loadReschedAvail(); }, [reschedAppt, reschedWeekStart, loadReschedAvail]);

  
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
      if (s === 'rejected' || s === 'cancelled' || s === 'canceled') continue;
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
      <ScheduleTabs />

      
      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Gestisci le prenotazioni dei pazienti. </strong> 
        Naviga tra le settimane, visualizza gli appuntamenti, riprogramma su uno slot libero e apri la visita online quando disponibile.
      </Alert>

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

        
      </Stack>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
      
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
              onReschedule={openReschedule}
              onOpenLink={(link) => openJoinDialog(link)}
            />
          ))}
        </Box>
      </Paper>

      
      <Dialog open={joinDialog.open} onClose={closeJoinDialog} fullWidth maxWidth="xs">
        <DialogTitle>Apri la visita online?</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            Verrai reindirizzato al link della videochiamata in una nuova scheda.
          </Alert>
          <Typography variant="body2" sx={{ mt: 2, wordBreak: 'break-all' }}>{joinDialog.link}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeJoinDialog}>Annulla</Button>
          <Button variant="contained" onClick={confirmJoin} startIcon={<OpenInNewIcon />}>Apri link</Button>
        </DialogActions>
      </Dialog>

   
      <Dialog open={Boolean(reschedAppt)} onClose={closeReschedule} fullWidth maxWidth="md">
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
                Seleziona uno slot libero — {italianDateRangeLabel(reschedDays[0], reschedDays[4])}
              </Typography>
            </Stack>
            {reschedAppt && (
              <Chip
                size="small"
                label={`${fullNameOrEmail(reschedAppt.patient)} • ${new Date(reschedAppt.date).toLocaleString('it-IT')}`}
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

function SlotRow({ hour, days, slotMap, loading, actionBusy, onReschedule, onOpenLink }) {
  const label = `${String(hour).padStart(2, '0')}:00`;

  return (
    <>
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1 }}>
        <Typography variant="body2">{label}</Typography>
      </Box>

      {days.map((d) => {
        const key = slotKey(d, hour);
        const appt = slotMap.get(key);
        const cellState = statusToCell(appt?.status); 

        const stateSx =
          cellState === 'accepted'
            ? { bgcolor: 'success.main', color: 'success.contrastText', borderColor: 'success.dark' }
            : cellState === 'pending'
            ? { bgcolor: 'warning.main', color: 'warning.contrastText', borderColor: 'warning.dark' }
            : { color: 'text.primary', borderColor: 'divider' };

        const isOnlineAccepted = appt && String(appt.status).toLowerCase() === 'accepted' && appt.isOnline && appt.videoLink;

        return (
          <Paper
            key={key}
            variant="outlined"
            sx={{
              p: 1,
              pr: isOnlineAccepted ? 5 : 1, 
              minHeight: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: cellState === 'free' ? 'center' : 'space-between',
              gap: 1,
              position: 'relative',
              ...stateSx,
            }}
          >
            {loading ? (
              <Typography variant="caption" component="span" sx={{ opacity: 0.8 }}>Caricamento…</Typography>
            ) : appt && cellState !== 'free' ? (
              <>
                <Stack spacing={0.25} sx={{ overflow: 'hidden' }}>
                  <Typography variant="body2" component="span" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {label} • {statusToLabel(appt.status)}
                  </Typography>
                  <Typography variant="caption" component="span" noWrap title={fullNameOrEmail(appt.patient)}>
                    {fullNameOrEmail(appt.patient)}
                  </Typography>
                </Stack>

                
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Riprogramma su altro slot">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => onReschedule(appt)}
                        disabled={actionBusy}
                        sx={{ color: 'inherit',
                          position: 'absolute',
                          right: 7,
                          bottom: 25,
                        }}
                      >
                        <EditCalendarIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>

                
                {isOnlineAccepted && (
                  <Tooltip title="Apri visita online">
                    <IconButton
                      size="small"
                      onClick={() => onOpenLink(appt.videoLink)}
                      sx={{
                        position: 'absolute',
                        right: 9,
                        bottom: 5,
                        color: 'common.white',    
                      }}
                      aria-label="Apri link visita online"
                    >
                      <LaptopMacIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            ) : (
              <Typography variant="body2" component="span" sx={{ opacity: 0.9, width: '100%', textAlign: 'center' }}>
                {label} • Libero
              </Typography>
            )}
          </Paper>
        );
      })}
    </>
  );
}

function ReschedRow({ hour, days, avail, onPick }) {
  const label = `${String(hour).padStart(2, '0')}:00`;

  return (
    <>
     
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

