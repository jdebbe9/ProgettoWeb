import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Alert, Box, Button, IconButton, Paper, Typography, Snackbar,
  CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Link as MuiLink, Tabs, Tab, Stack
} from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createAppointment, listAppointments } from '../api/appointments';
import { getSlotsAvailability } from '../api/slots';
import { connectSocket } from '../realtime/socket';
import { getMe as fetchMe } from '../api/user'; 

const THERAPIST_NAME = import.meta.env.VITE_THERAPIST_NAME || 'Il tuo terapeuta';
const SLOT_HOURS = [8, 9, 10, 11, 12, 15, 16, 17, 18, 19]; 

function ymd(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function safeDate(v){ const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
function sameIsoMinute(a, b) {
  const da = safeDate(a);
  const db = safeDate(b);
  if (!da || !db) return false;
  return da.toISOString().slice(0,16) === db.toISOString().slice(0,16);
}
function formatDT(d) { try { return new Date(d).toLocaleString('it-IT'); } catch { return '—'; } }
function statusItLower(s) {
  const x = String(s || '').toLowerCase();
  if (x === 'accepted') return 'confermato';
  if (x === 'pending' || x === 'rescheduled') return 'in attesa';
  return x;
}
function computeProfileCompleteLocal(obj) {
  const has = v => typeof v === 'string' && v.trim().length > 0;

  const cap   = obj?.cap ?? obj?.postalCode ?? obj?.zipcode ?? obj?.zip;
  const addr  = obj?.address ?? obj?.addressLine1 ?? obj?.street ?? obj?.via;
  const city  = obj?.city ?? obj?.citta ?? obj?.locality;
  

  return has(obj?.name) && has(obj?.surname) && has(obj?.email) &&
         has(addr) && has(city) && has(cap);
}



function startOfWeek(d) {
  const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = tmp.getDay(); 
  const diff = (day === 0 ? -6 : 1 - day); 
  tmp.setDate(tmp.getDate() + diff);
  tmp.setHours(0,0,0,0);
  return tmp;
}
function addDays(d, n){ const t = new Date(d); t.setDate(t.getDate()+n); return t; }

export default function Appointments() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [items, setItems] = useState([]);

  
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekDays = useMemo(() => [0,1,2,3,4].map(i => addDays(weekStart, i)), [weekStart]); 

  
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [avail, setAvail] = useState({});

  
  const [modeDialogOpen, setModeDialogOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [requestedMode, setRequestedMode] = useState('in_person');


  const [joinDialog, setJoinDialog] = useState({ open: false, link: '' });

  
  const [historyOpen, setHistoryOpen] = useState(false);

  const questionnaireDone = user?.questionnaireDone;
  const reloadTmrRef = useRef(null);
  const uid = user?._id || user?.id;

 
  const [profileOk, setProfileOk] = useState(true);


  const refreshProfileOk = useCallback(async () => {
  try {
    const data = await fetchMe();
    const ok = Boolean(data?.profileComplete) || computeProfileCompleteLocal(data);
    setProfileOk(ok);
  } catch {
    // s
  }
}, []);


  const today = useMemo(() => new Date(), []);
  const tomorrow0 = useMemo(() => { const t = new Date(); t.setDate(t.getDate()+1); t.setHours(0,0,0,0); return t; }, []);

  const showSnack = (message, severity = 'success') =>
    setSnack({ open: true, message, severity });
  const closeSnack = (_, reason) => { if (reason !== 'clickaway') setSnack(s => ({ ...s, open: false })); };

  const fetchAppointments = useCallback(async () => {
    const data = await listAppointments();
    setItems(Array.isArray(data) ? data : []);
  }, []);

  const loadAvailabilities = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const results = await Promise.all(
        weekDays.map(d => getSlotsAvailability(ymd(d)).catch(() => ({ date: ymd(d), slots: [] })))
      );
      const map = {};
      for (const r of results) map[r.date] = Array.isArray(r.slots) ? r.slots : [];
      setAvail(map);
    } finally {
      setSlotsLoading(false);
    }
  }, [weekDays]);


  useEffect(() => {
    if (!user) return;
    if (user.profileComplete === true) { setProfileOk(true); return; }

 
    const localOk = computeProfileCompleteLocal({
      name: user.name, surname: user.surname, email: user.email,
      address: user.address, city: user.city, cap: user.cap, phone: user.phone,
    });
    setProfileOk(localOk);
  }, [user]);

 
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const data = await fetchMe();
        if (!on) return;
        const ok =
          Boolean(data?.profileComplete) ||
          computeProfileCompleteLocal(data);
        setProfileOk(ok);
      } catch {
        // s
      }
    })();
    return () => { on = false; };
  }, [user]); 


  useEffect(() => { if (user) fetchAppointments(); }, [user, fetchAppointments]);
  useEffect(() => { if (user) loadAvailabilities(); }, [user, loadAvailabilities]);


  useEffect(() => {
    const fromState = location.state?.questionnaireJustCompleted === true;
    const fromStorage = localStorage.getItem('pc_qc_toast') === '1';
    if (fromState || fromStorage) {
      localStorage.removeItem('pc_qc_toast');
      if (fromState) navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

 
useEffect(() => {
  refreshProfileOk(); 
  const onFocus = () => refreshProfileOk();
  window.addEventListener('focus', onFocus);
  return () => window.removeEventListener('focus', onFocus);
}, [refreshProfileOk]);


 
  const reloadDebounced = useCallback(() => {
    if (reloadTmrRef.current) clearTimeout(reloadTmrRef.current);
    reloadTmrRef.current = setTimeout(() => {
      fetchAppointments();
      loadAvailabilities();
    }, 200);
  }, [fetchAppointments, loadAvailabilities]);

  useEffect(() => {
    if (!user) return;
    const s = connectSocket();
    if (uid) s.emit('join', String(uid));
    const onConnect = () => { fetchAppointments(); loadAvailabilities(); };
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
  }, [user, uid, fetchAppointments, loadAvailabilities, reloadDebounced]);

 
  const bookedDays = useMemo(() => {
    const set = new Set();
    for (const a of items) {
      const st = String(a.status || '').toLowerCase();
      if (st === 'pending' || st === 'accepted') {
        if (a.date) set.add(ymd(a.date));
      }
    }
    return set;
  }, [items]);

  
  const acceptedDays = useMemo(() => {
    const set = new Set();
    for (const a of items) {
      if (String(a.status || '').toLowerCase() === 'accepted' && a.date) set.add(ymd(a.date));
    }
    return set;
  }, [items]);

 
  const nowTS = Date.now();
  const upcoming = useMemo(
    () => items
      .filter(a => {
        const st = String(a.status || '').toLowerCase();
        if (st !== 'pending' && st !== 'accepted') return false;
        if (!a.date) return false;
        return new Date(a.date).getTime() >= nowTS;
      })
      .sort((a,b) => new Date(a.date) - new Date(b.date)),
    [items, nowTS]
  );

  const history = useMemo(
    () => items
      .filter(a => String(a.status || '').toLowerCase() === 'accepted' && a.date && new Date(a.date).getTime() < nowTS)
      .sort((a,b) => new Date(b.date) - new Date(a.date)),
    [items, nowTS]
  );

  
  async function handleConfirmBooking() {
    if (!pendingSlot) return;
    const start = safeDate(pendingSlot.start);
    if (!start) return;
    try {
      await createAppointment({
        date: start.toISOString(),
        requestedOnline: (requestedMode === 'online'),
      });
      setModeDialogOpen(false);
      setPendingSlot(null);
      showSnack('Appuntamento richiesto. In attesa di conferma.', 'success');
      await fetchAppointments();
      await loadAvailabilities();
    } catch {
      setModeDialogOpen(false);
      setPendingSlot(null);
      showSnack('Errore nella prenotazione', 'error');
    }
  }

  function openModeDialog(slot) {
    if (!profileOk) { showSnack('Completa il tuo profilo prima di prenotare.', 'warning'); return; } 
    if (!questionnaireDone) { showSnack('Prima completa il questionario.', 'warning'); return; }
    const start = safeDate(slot?.start);
    const end = safeDate(slot?.end);
    if (!start || !end) return;
    if (end <= today) return;
    if (start < tomorrow0) { showSnack('Serve almeno 1 giorno di preavviso.', 'warning'); return; }
    if (bookedDays.has(ymd(start))) { showSnack('Hai già una richiesta per questo giorno.', 'warning'); return; }

    setPendingSlot(slot);
    setRequestedMode('in_person');
    setModeDialogOpen(true);
  }

  function openJoinDialog(link) { if (link) setJoinDialog({ open: true, link }); }
  function confirmJoin() {
    const link = joinDialog.link;
    setJoinDialog({ open: false, link: '' });
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
  }

 
  const header = (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Tooltip title="Settimana precedente">
          <IconButton onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft /></IconButton>
        </Tooltip>
        <Tooltip title="Questa settimana">
          <IconButton onClick={() => setWeekStart(startOfWeek(new Date()))}><TodayIcon /></IconButton>
        </Tooltip>
        <Tooltip title="Settimana successiva">
          <IconButton onClick={() => setWeekStart(addDays(weekStart, +7))}><ChevronRight /></IconButton>
        </Tooltip>
        <Typography variant="h6" sx={{ ml: 1 }}>
          Appuntamenti con {THERAPIST_NAME}
        </Typography>
      </Stack>
    </Stack>
  );

  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 1200 }}>
      

      
      {!questionnaireDone && (
  <Alert
    severity="warning"
    sx={{ mb: 2 }}
    action={
      <Button color="inherit" size="small" onClick={() => navigate('/questionnaire')}>
        Vai al questionario
      </Button>
    }
  >
    <strong>Completa il questionario</strong> per poter prenotare il tuo appuntamento.
  </Alert>
)}

{!profileOk && (
  <Alert
    severity="warning"
    sx={{ mb: 2 }}
    action={
      <Button color="inherit" size="small" onClick={() => navigate('/profile')}>
        Vai al profilo
      </Button>
    }
  >
    <strong>Completa il tuo profilo</strong> per poter prenotare il tuo appuntamento.
  </Alert>
)}

      
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Calendario" />
          <Tab label="I miei Appuntamenti" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          {header}

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
              {weekDays.map((d, i) => (
                <Box key={i} sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2">
                    {d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Divider sx={{ mb: 1 }} />

            {slotsLoading ? (
              <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
              </Box>
            ) : (
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
                  <PatientSlotRow
                    key={h}
                    hour={h}
                    days={weekDays}
                    avail={avail}
                    items={items}
                    bookedDays={bookedDays}
                    acceptedDays={acceptedDays}
                    today={today}
                    tomorrow0={tomorrow0}
                    onJoin={openJoinDialog}
                    onBook={openModeDialog}
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6">In programma</Typography>
            <Button size="small" variant="outlined" onClick={() => setHistoryOpen(true)}>
              Storico
            </Button>
          </Stack>

          {upcoming.length === 0 && (
            <Alert severity="info">Nessun appuntamento in programma.</Alert>
          )}

          {upcoming.map(a => {
            const st = statusItLower(a.status);
            const isOnlineLink = String(a.status).toLowerCase() === 'accepted' && a.isOnline && a.videoLink && new Date(a.date).getTime() >= nowTS;
            return (
              <Paper
                key={a._id}
                variant="outlined"
                sx={{ p: 2, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <Typography sx={{ fontWeight: 600 }}>{`Appuntamento ${st}`}</Typography>
                  <Typography variant="body2" color="text.secondary">{formatDT(a.date)}</Typography>
                  {isOnlineLink && (
                    <MuiLink
                      href="#"
                      onClick={(e) => { e.preventDefault(); openJoinDialog(a.videoLink); }}
                      underline="hover"
                      sx={{ display: 'inline-block', mt: 0.5 }}
                    >
                      Entra nella visita
                    </MuiLink>
                  )}
                </div>
              </Paper>
            );
          })}
        </Paper>
      )}

     
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Storico appuntamenti</DialogTitle>
        <DialogContent dividers>
          {history.length === 0 ? (
            <Alert severity="info">Non ci sono appuntamenti passati.</Alert>
          ) : (
            <Stack spacing={1.25}>
              {history.map(a => (
                <Paper key={a._id} variant="outlined" sx={{ p: 1.25 }}>
                  <Typography sx={{ fontWeight: 600 }}>Appuntamento confermato</Typography>
                  <Typography variant="body2" color="text.secondary">{formatDT(a.date)}</Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>

    
      <Dialog open={modeDialogOpen} onClose={() => setModeDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Seleziona modalità</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              variant={requestedMode==='in_person' ? 'contained' : 'outlined'}
              onClick={() => setRequestedMode('in_person')}
              fullWidth
            >
              In studio
            </Button>
            <Button
              variant={requestedMode==='online' ? 'contained' : 'outlined'}
              onClick={() => setRequestedMode('online')}
              fullWidth
            >
              Online
            </Button>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            La richiesta verrà inviata al terapeuta. Se la visita sarà online e confermata,
            potrai entrare in call dalla sezione “I miei Appuntamenti”.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModeDialogOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleConfirmBooking}>Conferma</Button>
        </DialogActions>
      </Dialog>

     
      <Dialog open={joinDialog.open} onClose={() => setJoinDialog({ open: false, link: '' })} fullWidth maxWidth="xs">
        <DialogTitle>Apri la visita online?</DialogTitle>
        <DialogContent>
          <Alert severity="info">Verrai reindirizzato al link della videochiamata in una nuova scheda.</Alert>
          <Typography variant="body2" sx={{ mt: 2, wordBreak: 'break-all' }}>{joinDialog.link}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialog({ open: false, link: '' })}>Annulla</Button>
          <Button variant="contained" onClick={confirmJoin}>Apri link</Button>
        </DialogActions>
      </Dialog>

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

function PatientSlotRow({
  hour, days, avail, items, bookedDays, acceptedDays, today, tomorrow0, onJoin, onBook
}) {
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

        
        const myAppt = slot
          ? items.find(a =>
              (a.status === 'pending' || a.status === 'accepted') &&
              sameIsoMinute(a.date, slot.start)
            )
          : null;

        const end = slot ? safeDate(slot.end) : null;
        const isPast = end ? end <= today : true;

        const alreadyInDay = bookedDays.has(dateStr);
        const confirmedThisDay = acceptedDays.has(dateStr); 

        const isBusy = !slot || slot.busy || isPast;
        const isFree = slot && !slot.busy && !isPast && d.getTime() >= tomorrow0.getTime() && !alreadyInDay;

       
        let stateSx;
        if (myAppt && String(myAppt.status).toLowerCase() === 'accepted') {
          stateSx = { bgcolor: 'success.main', color: 'success.contrastText', borderColor: 'success.dark' };
        } else if (myAppt) {
          stateSx = { bgcolor: 'warning.main', color: 'warning.contrastText', borderColor: 'warning.dark' };
        } else {
          stateSx = { color: 'text.primary', borderColor: 'divider' };
        }

        return (
          <Paper
            key={`${dateStr}-${hour}`}
            variant="outlined"
            sx={{
              px: 1.25, py: 1,
              minHeight: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'visible',
              ...(confirmedThisDay && !myAppt ? { opacity: 0.45 } : null),
              ...stateSx,
              cursor: isFree ? 'pointer' : 'default',
            }}
            onClick={() => { if (isFree) onBook(slot); }}
          >
            {myAppt ? (
              <Stack spacing={0.25} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', textAlign: 'center' }}>
                  {label} • {statusItLower(myAppt.status)}
                </Typography>
              </Stack>
            ) : isBusy ? (
              <Typography variant="body2" sx={{ opacity: 0.9, whiteSpace: 'nowrap', textAlign: 'center' }}>
                {confirmedThisDay ? ' ' : 'Non disponibile'}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                {label} • Libero
              </Typography>
            )}

          
            {myAppt && String(myAppt.status).toLowerCase() === 'accepted' && myAppt.isOnline && myAppt.videoLink && (
              <Tooltip title="Apri visita online">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onJoin(myAppt.videoLink); }}
                  sx={{
                    position: 'center',
                    left : 3.5,
                    color: 'common.white',
                  }}
                  aria-label="Apri link visita online"
                >
                  <LaptopMacIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Paper>
        );
      })}
    </>
  );
}
