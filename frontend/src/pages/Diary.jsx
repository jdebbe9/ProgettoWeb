// frontend/src/pages/Diary.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import AddIcon from '@mui/icons-material/Add';
import TodayIcon from '@mui/icons-material/Today';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { listDiary, createDiary } from '../api/diary';

// ---- Costanti UI ----
const MOOD_SCALE = [
  { value: 1, label: 'Molto spiacevole', emoji: '😣', color: '#000000' }, // nero
  { value: 2, label: 'Spiacevole',       emoji: '🙁', color: '#00008B' }, // blu scuro
  { value: 3, label: 'Normale',          emoji: '😐', color: '#C8A2C8' }, // lilla
  { value: 4, label: 'Piacevole',        emoji: '🙂', color: '#FFD700' }, // giallo
  { value: 5, label: 'Molto piacevole',  emoji: '😄', color: '#FFA500' }, // arancione
];

const ALLOWED_EMOTIONS = [
  'gioia','tristezza','rabbia','ansia','paura','calma','sorpresa','disgusto',
  'amore','gratitudine','frustrazione','solitudine','speranza','colpa',
  'vergogna','orgoglio','eccitazione','sollievo','noia','confusione'
];

const schema = z.object({
  content: z.string().trim().max(5000, 'Massimo 5000 caratteri').optional().default(''),
  mood: z.coerce.number().min(1).max(5, 'Seleziona un umore'),
  emotions: z.array(z.string()).optional()
});

// ---- Utils ----
function moodMeta(m) {
  return MOOD_SCALE.find(x => x.value === Number(m)) || null;
}
function toLocal(dateLike) {
  const d = new Date(dateLike);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}
function dayKey(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function dateFromInput(v, endOfDay = false) {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/* ------------------ WIDGET STATISTICHE UMORE (solo scala 1–5) ------------------ */
function MoodStats({ entries }) {
  const [range, setRange] = useState('1y');   // '7d' | '1m' | '6m' | '1y'

  const startDate = useMemo(() => {
    const d = new Date();
    if (range === '7d') d.setDate(d.getDate() - 7);
    if (range === '1m') d.setMonth(d.getMonth() - 1);
    if (range === '6m') d.setMonth(d.getMonth() - 6);
    if (range === '1y') d.setFullYear(d.getFullYear() - 1);
    return d;
  }, [range]);

  // conteggi SOLO per umore 1..5
  const counts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const e of entries || []) {
      const ts = new Date(e.createdAt || e.date || e.created_at).getTime();
      if (!Number.isFinite(ts) || ts < startDate.getTime()) continue;
      const m = Number(e.mood);
      if (m >= 1 && m <= 5) c[m] += 1;
    }
    return c;
  }, [entries, startDate]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // gradient della torta in ordine 1→5
  const pieGradient = useMemo(() => {
    if (!total) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let acc = 0;
    const parts = MOOD_SCALE
      .filter(ms => counts[ms.value] > 0)
      .map(ms => {
        const start = (acc / total) * 360;
        acc += counts[ms.value];
        const end = (acc / total) * 360;
        return `${ms.color} ${start}deg ${end}deg`;
      });
    return `conic-gradient(${parts.join(', ')})`;
  }, [counts, total]);

  return (
    <Paper sx={{ mt: 3, p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1} mb={1.5}>
        <Typography variant="subtitle1" fontWeight={600}>Statistiche Umore</Typography>
        <ToggleButtonGroup exclusive size="small" value={range} onChange={(_,v)=>v && setRange(v)}>
          <ToggleButton value="7d">Settimana</ToggleButton>
          <ToggleButton value="1m">Mese</ToggleButton>
          <ToggleButton value="6m">6 mesi</ToggleButton>
          <ToggleButton value="1y">Anno</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {!total ? (
        <Typography variant="body2" sx={{ opacity: .7 }}>Nessun dato per questo intervallo.</Typography>
      ) : (
        <Stack direction="row" alignItems="center" gap={2} sx={{ height: 220 }}>
          {/* Donut */}
          <Box sx={{
            width: 180, height: 180, borderRadius: '50%',
            background: pieGradient, position: 'relative', flexShrink: 0
          }}>
            <Box sx={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Box sx={{
                width: 100, height: 100, borderRadius: '50%',
                background: '#fff', boxShadow: 'inset 0 0 0 1px #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700
              }}>
                {total}
              </Box>
            </Box>
          </Box>

          {/* LEGENDA: SOLO STATI D’ANIMO (1→5) */}
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            {MOOD_SCALE.map(ms => (
              <Stack key={ms.value} direction="row" alignItems="center" gap={1}>
                <Box sx={{ width: 12, height: 12, borderRadius: '3px', background: ms.color }} />
                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                  {ms.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {counts[ms.value]}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}

/* --------------------------- COMPONENTE PRINCIPALE --------------------------- */
export default function Diary() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filtro date
  const [fromStr, setFromStr] = useState('');
  const [toStr, setToStr] = useState('');

  // pagina corrente (indice entry nella lista filtrata)
  const [index, setIndex] = useState(0);

  // dialog nuova voce
  const [isCreating, setIsCreating] = useState(false);

  // swipe
  const startXRef = useRef(null);
  const pageRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { content: '', mood: 3, emotions: [] }
  });
  const { control, handleSubmit, reset, formState: { isSubmitting }, watch, setValue } = form;
  const selectedEmotions = watch('emotions');

  // --- load entries ---
  const reloadEntries = useCallback(async () => {
    const data = await listDiary();
    const list = (data?.items || data || []).slice().sort((a, b) => {
      const da = new Date(a.createdAt || a.date || a.created_at).getTime();
      const db = new Date(b.createdAt || b.date || b.created_at).getTime();
      return db - da; // più recenti prima
    });
    setEntries(list);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await reloadEntries();
      } catch (e) {
        setError(e?.message || 'Errore nel caricamento del diario');
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadEntries]);

  // filtro client-side
  const filtered = useMemo(() => {
    const from = dateFromInput(fromStr, false);
    const to = dateFromInput(toStr, true);
    return entries.filter((e) => {
      const t = new Date(e.createdAt || e.date || e.created_at).getTime();
      if (!Number.isFinite(t)) return false;
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime()) return false;
      return true;
    });
  }, [entries, fromStr, toStr]);

  // mappa giorni -> primo indice di quel giorno nella lista filtrata
  const dayNav = useMemo(() => {
    const days = [];
    const firstIndexOfDay = {};
    filtered.forEach((e, i) => {
      const k = dayKey(e.createdAt || e.date || e.created_at);
      if (!(k in firstIndexOfDay)) {
        firstIndexOfDay[k] = i;
        days.push(k);
      }
    });
    return { days, firstIndexOfDay };
  }, [filtered]);

  // reset index quando cambia la lista
  useEffect(() => {
    if (index > Math.max(0, filtered.length - 1)) setIndex(0);
  }, [filtered.length, index]);

  const total = filtered.length;
  const current = total ? filtered[index] : null;

  const currentDay = current ? dayKey(current.createdAt || current.date || current.created_at) : null;
  const dayPos = currentDay ? dayNav.days.indexOf(currentDay) : -1;

  const canPrevDay = dayPos >= 0 && dayPos < dayNav.days.length - 1; // giorni più vecchi
  const canNextDay = dayPos > 0; // giorni più recenti

  // Frecce: nota-per-nota nel giorno, poi giorno precedente/successivo
  const dayEntries = useMemo(() => {
    if (!current) return [];
    const key = currentDay;
    let start = index;
    while (start > 0 && dayKey(filtered[start - 1].createdAt || filtered[start - 1].date || filtered[start - 1].created_at) === key) {
      start--;
    }
    let end = index;
    while (end < filtered.length - 1 && dayKey(filtered[end + 1].createdAt || filtered[end + 1].date || filtered[end + 1].created_at) === key) {
      end++;
    }
    const items = [];
    for (let i = start; i <= end; i++) items.push({ entry: filtered[i], idx: i });
    return items;
  }, [filtered, index, current, currentDay]);

  const dayStartIdx = dayEntries.length ? dayEntries[0].idx : index;
  const dayEndIdx   = dayEntries.length ? dayEntries[dayEntries.length - 1].idx : index;

  const goPrevDay = useCallback(() => {
    if (!current) return;
    if (index < dayEndIdx) { setIndex(index + 1); return; } // nota più vecchia nello stesso giorno
    if (dayPos >= 0 && dayPos < dayNav.days.length - 1) {   // giorno precedente
      const targetKey = dayNav.days[dayPos + 1];
      const idx = dayNav.firstIndexOfDay[targetKey];
      if (Number.isInteger(idx)) setIndex(idx);
    }
  }, [current, index, dayEndIdx, dayPos, dayNav.days, dayNav.firstIndexOfDay]);

  const goNextDay = useCallback(() => {
    if (!current) return;
    if (index > dayStartIdx) { setIndex(index - 1); return; } // nota più recente nello stesso giorno
    if (dayPos > 0) {                                          // giorno successivo
      const targetKey = dayNav.days[dayPos - 1];
      const idx = dayNav.firstIndexOfDay[targetKey];
      if (Number.isInteger(idx)) setIndex(idx);
    }
  }, [current, index, dayStartIdx, dayPos, dayNav.days, dayNav.firstIndexOfDay]);

  // Keyboard arrows
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goPrevDay();
      if (e.key === 'ArrowRight') goNextDay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrevDay, goNextDay]);

  // Swipe
  const onTouchStart = (e) => { startXRef.current = e.touches?.[0]?.clientX ?? null; };
  const onTouchEnd = (e) => {
    const start = startXRef.current;
    const end = e.changedTouches?.[0]?.clientX ?? null;
    if (start == null || end == null) return;
    const dx = end - start;
    if (Math.abs(dx) > 40) {
      if (dx < 0) goNextDay(); else goPrevDay();
      if (pageRef.current) {
        pageRef.current.classList.add('pageFlip');
        setTimeout(() => pageRef.current && pageRef.current.classList.remove('pageFlip'), 300);
      }
    }
  };

  const clearFilter = () => { setFromStr(''); setToStr(''); };

  // --- create ---
  const openCreate = () => setIsCreating(true);
  const closeCreate = () => { setIsCreating(false); reset({ content: '', mood: 3, emotions: [] }); };
  const onSubmitCreate = async (values) => {
    try {
      await createDiary(values);
      await reloadEntries();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Errore nel salvataggio');
    } finally {
      closeCreate();
      setIndex(0);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" gap={2} mb={2}>
        <Typography variant="h5" sx={{ mb:1.5 }}>Diario</Typography>

        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        
          <TextField label="Dal" type="date" size="small" value={fromStr} onChange={(e) => setFromStr(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Al"  type="date" size="small" value={toStr}  onChange={(e) => setToStr(e.target.value)}  InputLabelProps={{ shrink: true }} />
          {(fromStr || toStr) && (
            <IconButton onClick={clearFilter} title="Pulisci filtro">
              <FilterAltOffIcon />
            </IconButton>
          )}

        
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nuova voce
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" py={6}><CircularProgress /></Stack>
      ) : !total ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Nessuna voce per l’intervallo selezionato.</Typography>
        </Paper>
      ) : (
        <Stack direction="row" alignItems="stretch" justifyContent="center" gap={1}>
        
          <IconButton onClick={goPrevDay} disabled={!canPrevDay} size="large" sx={{ alignSelf: 'center' }}>
            <ChevronLeftIcon fontSize="inherit" />
          </IconButton>

       
          <Paper
            ref={pageRef}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            elevation={4}
            sx={{
              flex: '1 1 720px',
              maxWidth: 820,
              minHeight: 420,
              p: { xs: 2, md: 3 },
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 50%, #ffffff 100%)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0, left: 0, bottom: 0,
                width: 16,
                background: 'repeating-linear-gradient(90deg, transparent 0 14px, rgba(0,0,0,0.05) 14px 15px)',
                pointerEvents: 'none'
              }
            }}
          >
          
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                {toLocal(current.createdAt || current.date || current.created_at)}
              </Typography>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                {!!current.mood && (
                  <Chip
                    label={`${moodMeta(current.mood)?.emoji ?? ''} ${moodMeta(current.mood)?.label ?? 'Umore'}`}
                    variant="outlined"
                    sx={{
                      borderColor: moodMeta(current.mood)?.color,
                      color: moodMeta(current.mood)?.color,
                      fontWeight: 600
                    }}
                  />
                )}
                {(current.emotions || []).map((emo) => (
                  <Chip key={emo} label={emo} size="small" />
                ))}
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

           
            <Stack spacing={2} sx={{ minHeight: 260 }}>
              {(() => {
                const key = currentDay;
                let start = index;
                while (start > 0 && dayKey(filtered[start - 1].createdAt || filtered[start - 1].date || filtered[start - 1].created_at) === key) start--;
                let end = index;
                while (end < filtered.length - 1 && dayKey(filtered[end + 1].createdAt || filtered[end + 1].date || filtered[end + 1].created_at) === key) end++;
                const items = [];
                for (let i = start; i <= end; i++) items.push(filtered[i]);

                return items.map((entry) => {
                  const when = new Date(entry.createdAt || entry.date || entry.created_at);
                  const timeStr = Number.isNaN(when.getTime()) ? '' : when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <Paper key={entry._id || entry.id || when.getTime()} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>{timeStr}</Typography>
                        {!!entry.mood && (
                          <Chip
                            label={`${moodMeta(entry.mood)?.emoji ?? ''} ${moodMeta(entry.mood)?.label ?? ''}`}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: moodMeta(entry.mood)?.color,
                              color: moodMeta(entry.mood)?.color,
                              fontWeight: 600
                            }}
                          />
                        )}
                      </Stack>
                      <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {entry.content || <span style={{ opacity: 0.5 }}>[Nessun testo]</span>}
                      </Typography>
                      {(entry.emotions?.length ? (
                        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                          {entry.emotions.map((emo) => (
                            <Chip key={emo} label={emo} size="small" />
                          ))}
                        </Stack>
                      ) : null)}
                    </Paper>
                  );
                });
              })()}
            </Stack>

         
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ position: 'absolute', bottom: 8, left: 0, right: 0, px: 3 }}
            >
              <Typography variant="caption" sx={{ opacity: 0.6 }}>
                Giorno {dayPos + 1} / {dayNav.days.length}
              </Typography>
              <Stack direction="row" gap={1}>
                <Button size="small" variant="outlined" onClick={goPrevDay} disabled={!canPrevDay} startIcon={<ChevronLeftIcon />}>
                  Giorno prec.
                </Button>
                <Button size="small" variant="contained" onClick={goNextDay} disabled={!canNextDay} endIcon={<ChevronRightIcon />}>
                  Giorno succ.
                </Button>
              </Stack>
            </Stack>
          </Paper>

        
          <IconButton onClick={goNextDay} disabled={!canNextDay} size="large" sx={{ alignSelf: 'center' }}>
            <ChevronRightIcon fontSize="inherit" />
          </IconButton>
        </Stack>
      )}

     
      <MoodStats entries={entries} />

    
      <Dialog open={isCreating} onClose={closeCreate} fullWidth maxWidth="sm">
        <DialogTitle>Nuova Voce del Diario</DialogTitle>
        <form onSubmit={handleSubmit(onSubmitCreate)}>
          <DialogContent>
            <Stack spacing={2}>
             
              <Stack>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Stato d&apos;animo</Typography>
                <Controller
                  name="mood"
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      {...field}
                      exclusive
                      onChange={(_, v) => v && field.onChange(v)}
                      size="small"
                      fullWidth
                    >
                      {MOOD_SCALE.map((m) => (
                        <ToggleButton
                          key={m.value}
                          value={m.value}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderColor: m.color,
                            '&.Mui-selected': {
                              backgroundColor: `${m.color}20`,
                              borderColor: m.color
                            }
                          }}
                        >
                          <span style={{ marginRight: 6 }}>{m.emoji}</span>{m.label}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  )}
                />
              </Stack>

       
              <Stack>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Emozioni</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {ALLOWED_EMOTIONS.map((emo) => {
                    const active = (selectedEmotions || []).includes(emo);
                    return (
                      <Chip
                        key={emo}
                        label={emo}
                        variant={active ? 'filled' : 'outlined'}
                        onClick={() => {
                          const set = new Set(selectedEmotions || []);
                          if (set.has(emo)) set.delete(emo); else set.add(emo);
                          setValue('emotions', Array.from(set));
                        }}
                        clickable
                      />
                    );
                  })}
                </Stack>
              </Stack>

         
              <Controller
                name="content"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Scrivi qui..."
                    placeholder="Com'è andata oggi?"
                    multiline
                    minRows={4}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCreate}>Annulla</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      
      <style>{`
        .pageFlip { animation: pageFlip .3s ease-out; }
        @keyframes pageFlip {
          0% { transform: perspective(1000px) rotateY(0deg); }
          50% { transform: perspective(1000px) rotateY(-8deg); box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
          100% { transform: perspective(1000px) rotateY(0deg); }
        }
      `}</style>
    </Box>
  );
}
