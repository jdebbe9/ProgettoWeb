// frontend/src/pages/therapist/ScheduleAvailability.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Alert, Box, CircularProgress, Grid, Paper, Stack, Typography, Button } from '@mui/material';
import ScheduleTabs from '../../components/ScheduleTabs';
import { listAppointments } from '../../api/appointments';
import { connectSocket } from '../../realtime/socket';
import { Link as RouterLink } from 'react-router-dom'; // <-- FIX: import aggiunto

const WORK_DAYS = [1,2,3,4,5]; // lun-ven (Mon=1)
const MORNING = [8,9,10,11,12];
const AFTERNOON = [15,16,17,18,19];
const SLOT_HOURS = [...MORNING, ...AFTERNOON];

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function ymd(d) { const p = (n)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function weekday(d) { const w = new Date(d).getDay(); return w === 0 ? 7 : w; } // 1..7 (lun=1)

export default function ScheduleAvailability() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [apps, setApps]       = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const all = await listAppointments();
      setApps(Array.isArray(all) ? all : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nel caricamento disponibilità.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
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
  }, [load]);

  const accepted = useMemo(() => {
    const ok = new Set(['accepted','rescheduled']);
    return apps.filter(a => ok.has(a.status));
  }, [apps]);

  // Costruisci le prossime 2 settimane (14 giorni)
  const today = startOfDay(new Date());
  const days = useMemo(() => {
    const arr = [];
    for (let i=0;i<14;i++) {
      const d = addDays(today, i);
      const wd = weekday(d);
      const isWork = WORK_DAYS.includes(wd);
      const slots = isWork ? SLOT_HOURS.map(h => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0, 0)) : [];
      arr.push({ date: d, wd, isWork, slots });
    }
    return arr;
  }, [today]);

  // Mappa occupazioni per ora
  const busyKey = (dt) => `${ymd(dt)}@${String(dt.getHours()).padStart(2,'0')}`;
  const busySet = useMemo(() => {
    const s = new Set();
    accepted.forEach(a => {
      const t = new Date(a.date);
      s.add(`${ymd(t)}@${String(t.getHours()).padStart(2,'0')}`);
    });
    return s;
  }, [accepted]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>Agenda — Disponibilità</Typography>
      <ScheduleTabs />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <CircularProgress />}

      {!loading && (
        <Grid container spacing={2}>
          {days.map(d => {
            const total = d.slots.length;
            const free = d.slots.filter(s => !busySet.has(busyKey(s))).length;
            const label = d.date.toLocaleDateString('it-IT', { weekday:'long', day:'2-digit', month:'2-digit' });
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={ymd(d.date)}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography fontWeight="bold">{label}</Typography>
                    {!d.isWork ? (
                      <Typography color="text.secondary">Giorno non lavorativo</Typography>
                    ) : (
                      <>
                        <Typography>Disponibilità: {free}/{total} slot</Typography>
                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          {d.slots.map(s => {
                            const taken = busySet.has(busyKey(s));
                            const text = `${String(s.getHours()).padStart(2,'0')}:00`;
                            return (
                              <Paper key={text} variant="outlined" sx={{ px: 1, py: 0.5, opacity: taken ? 0.4 : 1 }}>
                                <Typography variant="caption">{text}</Typography>
                              </Paper>
                            );
                          })}
                        </Stack>
                        <Button
                          size="small"
                          component={RouterLink}
                          to={`/therapist/schedule?date=${ymd(d.date)}`}
                          sx={{ alignSelf: 'flex-start', mt: 1 }}
                        >
                          Vai al giorno
                        </Button>
                      </>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

