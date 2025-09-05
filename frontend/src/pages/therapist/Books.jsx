// frontend/src/pages/therapist/Books.jsx
import { useEffect, useState, useCallback } from 'react';
import { Box, Stack, Typography, TextField, Select, MenuItem, Button, Grid, Paper, Chip, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { listBooks, deleteBook } from '../../api/books';
import AssignMaterialDialog from '../../components/AssignMaterialDialog';

function statusLabel(s) {
  if (s === 'reading') return 'In lettura';
  if (s === 'read') return 'Letto';
  return 'Consigliato';
}

export default function Books() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignItem, setAssignItem] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await listBooks({ q: q || undefined, status: status || undefined });
      setItems(data);
      setErr('');
    } catch {
      setErr('Errore nel caricamento libri');
    }
  }, [q, status]);

  useEffect(() => { load(); }, [load]);

  const openAssign = (item) => { setAssignItem(item); setAssignOpen(true); };
  const closeAssign = (didAssign) => {
    setAssignOpen(false);
    setAssignItem(null);
    if (didAssign) load();
  };

  return (
    <Box sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Libri</Typography>
        <Button variant="contained" onClick={() => navigate('/therapist/books/new')}>Nuovo libro</Button>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Cerca" value={q} onChange={e => setQ(e.target.value)} />
        <Select value={status} onChange={e => setStatus(e.target.value)} displayEmpty sx={{ minWidth: 180 }}>
          <MenuItem value=""><em>Tutti gli stati</em></MenuItem>
          <MenuItem value="recommended">Consigliato</MenuItem>
          <MenuItem value="reading">In lettura</MenuItem>
          <MenuItem value="read">Letto</MenuItem>
        </Select>
        <Button onClick={load}>Filtra</Button>
      </Stack>

      <Grid container spacing={2}>
        {items.map(b => (
          <Grid item xs={12} md={6} key={b._id}>
            <Paper variant="outlined" sx={{ p:2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography fontWeight="bold">{b.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {b.author || '—'} {b.year ? `• ${b.year}` : ''}
                  </Typography>
                  {b.isbn && <Chip size="small" label={`ISBN ${b.isbn}`} sx={{ mt: 1 }} />}
                </div>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={statusLabel(b.status)} />
                  <Button size="small" onClick={() => openAssign(b)}>Assegna</Button>
                  <Button size="small" component={RouterLink} to={`/therapist/books/${b._id}`}>Modifica</Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (confirm('Eliminare questo libro?')) {
                        await deleteBook(b._id);
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
          <Grid item xs={12}><Alert severity="info">Nessun libro trovato.</Alert></Grid>
        )}
      </Grid>

      <AssignMaterialDialog
        open={assignOpen}
        onClose={closeAssign}
        itemType="Book"
        item={assignItem}
      />
    </Box>
  );
}

