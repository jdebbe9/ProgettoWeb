// frontend/src/pages/therapist/Patients.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert, Box, CircularProgress, Grid, Paper, Stack, TextField, Typography, Button
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { getAllPatients } from '../../api/therapists';

function norm(s) { return (s || '').toLowerCase(); }

export default function Patients() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [items, setItems]     = useState([]);
  const [q, setQ]             = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await getAllPatients();
      const list = Array.isArray(res?.items) ? res.items : [];
      setItems(list);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nel caricamento pazienti.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!q) return items;
    const nq = norm(q);
    return items.filter(p => {
      const name = `${p.name || ''} ${p.surname || ''}`.trim();
      return norm(name).includes(nq) || norm(p.email).includes(nq);
    });
  }, [items, q]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Pazienti</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Cerca per nome o email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ maxWidth: 360 }}
        />
        <Button onClick={load}>Aggiorna</Button>
      </Stack>

      {loading ? <CircularProgress /> : (
        <Grid container spacing={2}>
          {filtered.map(p => (
            <Grid item xs={12} md={6} key={p._id}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <div>
                    <Typography fontWeight="bold">{p.name} {p.surname}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.email}</Typography>
                  </div>
                  <Button component={RouterLink} to={`/therapist/patients/${p._id}`} size="small">
                    Apri scheda
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          ))}
          {!filtered.length && (
            <Grid item xs={12}>
              <Alert severity="info">Nessun paziente trovato.</Alert>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
