// frontend/src/pages/Materials.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Stack, Typography, Paper, Chip, Button, Alert, Divider, TextField, Select, MenuItem } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { listAssignments, updateAssignment } from '../api/assignments';
import { listPublishedArticles } from '../api/articles';

function statusLabel(s){
  if (s==='done') return 'Letto';
  if (s==='in_progress') return 'In corso';
  return 'Da leggere';
}
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
        <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>
          Qui trovi libri e articoli che il terapeuta ti ha assegnato. Puoi segnare lo stato di avanzamento.
        </Typography>

        {errAssign && <Alert severity="error" sx={{ mb:2 }}>{errAssign}</Alert>}

        <Stack spacing={1.25}>
          {assignments.map(a=>{
            const isBook = a.itemType === 'Book';
            const purchaseUrl = isBook
              ? (a.item?.purchaseUrl || a.item?.url || a.item?.link || '')
              : '';

            return (
              <Paper key={a._id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                  <div>
                    <Typography fontWeight="bold">
                      {a.item?.title || 'Elemento'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isBook
                        ? (a.item?.author ? `Libro • ${a.item.author}` : 'Libro')
                        : 'Articolo'}
                    </Typography>

                    {/* Stato lettura */}
                    <Chip size="small" label={statusLabel(a.status)} sx={{ mt: 1 }} />

                    {/* Link acquisto libro, se disponibile */}
                    {isBook && purchaseUrl && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {/* "scritta" cliccabile come richiesto */}
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
                  </div>

                  <Stack direction="row" spacing={1}>
                    <Button size="small" disabled={busy===a._id} onClick={()=>mark(a._id,'in_progress')}>In corso</Button>
                    <Button size="small" variant="contained" disabled={busy===a._id} onClick={()=>mark(a._id,'done')}>Segna letto</Button>
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

      {/* Sezione: Articoli del terapeuta (newsletter-style) */}
      <Box>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2} alignItems={{ sm:'center' }} sx={{ mb:2 }}>
          <Typography variant="h5" sx={{ flexGrow:1 }}>Articoli del terapeuta</Typography>
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
          <Button onClick={loadArticles}>Filtra</Button>
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
