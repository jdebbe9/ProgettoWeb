// frontend/src/pages/Materials.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Stack, Typography, Paper, Chip, Button, Alert, Divider, TextField, Select, MenuItem,
  IconButton, Tooltip
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Link as RouterLink } from 'react-router-dom';
import { listAssignments, updateAssignment } from '../api/assignments';
import { listPublishedArticles } from '../api/articles';

function formatDate(d) {
  try { return new Date(d).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return ''; }
}
function trimText(t, max = 200) {
  if (!t) return '';
  const s = String(t);
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export default function Materials(){
  const [assignments,setAssignments] = useState([]);
  const [articles,setArticles] = useState([]);
  const [errAssign,setErrAssign] = useState('');
  const [errArticles,setErrArticles] = useState('');
  const [busy,setBusy] = useState(null);

  // filtri articoli pubblici
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');

  const loadAssignments = useCallback(async ()=>{
    try{
      setErrAssign('');
      const list = await listAssignments();
      setAssignments(list);
    }catch(e){
      console.error('Errore nel caricamento delle letture assegnate:', e);
      setErrAssign('Errore nel caricamento delle letture assegnate.');
    }
  },[]);

  const loadArticles = useCallback(async ()=>{
    try{
      setErrArticles('');
      const list = await listPublishedArticles({
        limit: 50,
        q: q || undefined,
        tag: tag || undefined
      });
      setArticles(list);
    }catch(e){
      console.error('Errore nel caricamento articoli pubblicati:', e);
      setErrArticles('Errore nel caricamento degli articoli del terapeuta.');
    }
  },[q, tag]);

  useEffect(()=>{ loadAssignments(); },[loadAssignments]);
  useEffect(()=>{ loadArticles(); },[loadArticles]);

  const mark = async (id, status) => {
    setBusy(id);
    try {
      await updateAssignment(id, { status });
      await loadAssignments();
    } catch (e) {
      console.error('Errore aggiornando lo stato assegnazione:', e);
      setErrAssign('Impossibile aggiornare lo stato. Riprova.');
    } finally {
      setBusy(null);
    }
  };

  // tags disponibili dalle card caricate
  const availableTags = useMemo(() => {
    const set = new Set();
    for (const a of articles) {
      (a.tags || []).forEach(t => set.add(t));
    }
    return Array.from(set).sort((a,b)=> a.localeCompare(b));
  }, [articles]);

  return (
    <Box sx={{ p:2, display:'grid', gap:3 }}>
      {/* Sezione: Letture assegnate */}
      <Box>
        <Typography variant="h5" sx={{ mb:1.5 }}>Letture assegnate</Typography>

        

        {errAssign && <Alert severity="error" sx={{ mb:2 }}>{errAssign}</Alert>}

        <Stack spacing={1}>
          {assignments.map(a=>{
            const isBook = a.itemType === 'Book';
            const purchaseUrl = isBook
              ? (a.item?.purchaseUrl || a.item?.url || a.item?.link || '')
              : '';

            return (
              <Paper
                key={a._id}
                variant="outlined"
                sx={{ p: 1, borderRadius: 2 }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
                  {/* Info elemento */}
                  <Stack spacing={0.25} sx={{ minWidth: 220 }}>
                    <Typography fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {a.item?.title || 'Elemento'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isBook
                        ? (a.item?.author ? `Libro • ${a.item.author}` : 'Libro')
                        : 'Articolo'}
                    </Typography>

                    {/* Link acquisto libro, se disponibile */}
                    {isBook && purchaseUrl && (
                      <Typography variant="body2" sx={{ mt: 0.25 }}>
                        <a
                          href={purchaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'underline' }}
                        >
                          Acquista il libro
                        </a>
                      </Typography>
                    )}
                  </Stack>

                  {/* Stato compatto: Select a destra */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary">Stato</Typography>
                    <Select
                      size="small"
                      value={a.status || 'todo'}
                      onChange={(e)=> mark(a._id, e.target.value)}
                      disabled={busy === a._id}
                      sx={{ minWidth: 100 }}
                    >
                      
                      <MenuItem value="in_progress">In corso</MenuItem>
                      <MenuItem value="done">Letto</MenuItem>
                    </Select>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
          {!assignments.length && !errAssign && (
            <Alert severity="info">Non ci sono materiali assegnati al momento.</Alert>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* Sezione: Articoli del terapeuta */}
      <Box>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2} alignItems={{ sm:'center' }} sx={{ mb:2 }}>
          <Typography variant="h5" sx={{ flexGrow:1 }}>Articoli pubblicati</Typography>
          <TextField
            label="Cerca"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Titolo, testo, tag…"
            size="small"
          />
          <Select
            size="small"
            value={tag}
            onChange={e => setTag(e.target.value)}
            displayEmpty
            sx={{ minWidth: 180 }}
          >
            <MenuItem value=""><em>Tutti i tag</em></MenuItem>
            {availableTags.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>

          {/* ⬇️ Sostituisce il bottone 'Filtra' con icona imbuto */}
          <Tooltip title="Filtra">
            <IconButton onClick={loadArticles} size="small" aria-label="Filtra articoli">
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {errArticles && <Alert severity="error" sx={{ mb:2 }}>{errArticles}</Alert>}

        <Stack spacing={1.25}>
          {articles.map(art => (
            <Paper key={art._id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack spacing={0.5}>
                <Typography fontWeight="bold">{art.title}</Typography>
                {!!art.updatedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Aggiornato il {formatDate(art.updatedAt)}
                  </Typography>
                )}
                {!!art.abstract && (
                  <Typography variant="body2" color="text.secondary">
                    {trimText(art.abstract, 240)}
                  </Typography>
                )}
                {!!(art.tags && art.tags.length) && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap:'wrap' }}>
                    {art.tags.map((t,i)=>(
                      <Chip key={`${art._id}-tag-${i}`} size="small" label={t} />
                    ))}
                  </Stack>
                )}

                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/articles/${art._id}`}
                    variant="outlined"
                  >
                    Leggi
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
          {!articles.length && !errArticles && (
            <Alert severity="info">Non ci sono ancora articoli pubblicati.</Alert>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
