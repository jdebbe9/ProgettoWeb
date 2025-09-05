// frontend/src/pages/therapist/Articles.jsx
import { useEffect, useState, useCallback } from 'react';
import { Box, Stack, Typography, TextField, Select, MenuItem, Button, Grid, Paper, Chip, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { listArticles, deleteArticle } from '../../api/articles';
import AssignMaterialDialog from '../../components/AssignMaterialDialog';

function statusLabel(s) { return s === 'published' ? 'Pubblicato' : 'Bozza'; }

export default function Articles() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignItem, setAssignItem] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await listArticles({ q: q || undefined, status: status || undefined });
      setItems(data);
      setErr('');
    } catch {
      setErr('Errore nel caricamento articoli');
    }
  }, [q, status]);

  useEffect(() => { load(); }, [load]);

  const openAssign = (item) => { setAssignItem(item); setAssignOpen(true); };
  const closeAssign = (didAssign) => {
    setAssignOpen(false);
    setAssignItem(null);
    if (didAssign) load(); // opzionale: ricarica se serve
  };

  return (
    <Box sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Articoli</Typography>
        <Button variant="contained" onClick={() => navigate('/therapist/articles/new')}>Nuovo articolo</Button>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Cerca" value={q} onChange={e => setQ(e.target.value)} />
        <Select value={status} onChange={e => setStatus(e.target.value)} displayEmpty sx={{ minWidth: 180 }}>
          <MenuItem value=""><em>Tutti gli stati</em></MenuItem>
          <MenuItem value="draft">Bozza</MenuItem>
          <MenuItem value="published">Pubblicato</MenuItem>
        </Select>
        <Button onClick={load}>Filtra</Button>
      </Stack>

      <Grid container spacing={2}>
        {items.map(a => (
          <Grid item xs={12} md={6} key={a._id}>
            <Paper variant="outlined" sx={{ p:2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <div>
                  <Typography fontWeight="bold">{a.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a.updatedAt ? new Date(a.updatedAt).toLocaleString('it-IT') : ''}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {Array.isArray(a.tags) && a.tags.map(t => <Chip key={t} size="small" label={t} />)}
                  </Stack>
                </div>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  <Chip size="small" label={statusLabel(a.status)} />
                  <Button size="small" onClick={() => openAssign(a)}>Assegna</Button>
                  <Button size="small" component={RouterLink} to={`/therapist/articles/${a._id}`}>Modifica</Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (confirm('Eliminare questo articolo?')) {
                        await deleteArticle(a._id);
                        load();
                      }
                    }}
                  >
                    Elimina
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        ))}
        {!items.length && (
          <Grid item xs={12}><Alert severity="info">Nessun articolo trovato.</Alert></Grid>
        )}
      </Grid>

      <AssignMaterialDialog
        open={assignOpen}
        onClose={closeAssign}
        itemType="Article"
        item={assignItem}
      />
    </Box>
  );
}
