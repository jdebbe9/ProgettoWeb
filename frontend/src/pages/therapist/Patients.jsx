// frontend/src/pages/therapist/Patients.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert, Box, CircularProgress, Paper, Stack, TextField, Typography, Button,
  Chip, FormControlLabel, Switch, MenuItem, Select, InputLabel, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  IconButton, Tooltip, Grid
} from '@mui/material';
import CachedIcon from '@mui/icons-material/Cached';
import { Link as RouterLink } from 'react-router-dom';
import { getAllPatients } from '../../api/therapists';
import PatientDrawer from '../../components/patients/PatientDrawer';

function norm(s) { return (s || '').toLowerCase(); }
function fullName(p) { return `${p?.name || ''} ${p?.surname || ''}`.trim(); }
function fmtDate(d) {
  try { return new Date(d).toLocaleDateString('it-IT'); } catch { return '—'; }
}

export default function Patients() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [items, setItems]     = useState([]);

  
  const [q, setQ]                         = useState('');
  const [onlyNoQuestionnaire, setOnlyNoQuestionnaire] = useState(false);
  const [orderBy, setOrderBy]             = useState('name');   
  const [order, setOrder]                 = useState('asc');   

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);

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

 
  const kpi = useMemo(() => {
    const total = items.length;
    const noQuest = items.filter(p => !p?.questionnaireDone).length;
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const newLast7 = items.filter(p => {
      const t = p?.createdAt ? new Date(p.createdAt).getTime() : 0;
      return t >= sevenDaysAgo;
    }).length;
    return { total, noQuest, newLast7 };
  }, [items]);

 
  const filtered = useMemo(() => {
    let arr = items;

    if (q) {
      const nq = norm(q);
      arr = arr.filter(p => {
        const name = fullName(p);
        return norm(name).includes(nq) || norm(p.email).includes(nq);
      });
    }

    if (onlyNoQuestionnaire) {
      arr = arr.filter(p => !p?.questionnaireDone);
    }

    const cmp = (a, b) => {
      let va, vb;

      if (orderBy === 'name') {
        va = norm(fullName(a)); vb = norm(fullName(b));
      } else if (orderBy === 'email') {
        va = norm(a?.email || ''); vb = norm(b?.email || '');
      } else { 
        va = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        vb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      }

      if (va < vb) return order === 'asc' ? -1 : 1;
      if (va > vb) return order === 'asc' ? 1 : -1;
      return 0;
    };

    return [...arr].sort(cmp);
  }, [items, q, onlyNoQuestionnaire, orderBy, order]);

  const handleSort = (key) => {
    if (orderBy === key) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(key);
      setOrder('asc');
    }
  };

  const openDrawerFor = (p) => {
    setSelected(p);
    setDrawerOpen(true);
  };

  const resetFilters = () => {
    setQ('');
    setOnlyNoQuestionnaire(false);
    setOrderBy('name');
    setOrder('asc');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Pazienti</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

    
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 220 }}>
          <Typography variant="overline" color="text.secondary">Totale</Typography>
          <Typography variant="h4">{kpi.total}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 220 }}>
          <Typography variant="overline" color="text.secondary">Senza questionario</Typography>
          <Typography variant="h4">{kpi.noQuest}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 220 }}>
          <Typography variant="overline" color="text.secondary">Nuovi ultimi 7 giorni</Typography>
          <Typography variant="h4">{kpi.newLast7}</Typography>
        </Paper>
      </Stack>

      {/* Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container alignItems="center" spacing={2}>
          
          <Grid item xs>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ md: 'center' }}
              sx={{ flexWrap: 'wrap' }}
            >
              <TextField
                label="Cerca per nome o email"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                sx={{ maxWidth: 360, minWidth: 30}}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={onlyNoQuestionnaire}
                    onChange={(e) => setOnlyNoQuestionnaire(e.target.checked)}
                  />
                }
                label="Solo senza questionario"
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="order-by-label">Ordina per</InputLabel>
                <Select
                  labelId="order-by-label"
                  value={orderBy}
                  label="Ordina per"
                  onChange={(e) => setOrderBy(e.target.value)}
                >
                  <MenuItem value="name">Nome</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="createdAt">Data creazione</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Grid>

      
          <Grid item>
            <Tooltip title="Reimposta filtri">
              <IconButton onClick={resetFilters} aria-label="Reimposta filtri">
                <CachedIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabella */}
      {loading ? (
        <CircularProgress />
      ) : (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="medium" aria-label="Elenco pazienti">
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === 'name' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={() => handleSort('name')}
                    >
                      Nome
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'email' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'email'}
                      direction={orderBy === 'email' ? order : 'asc'}
                      onClick={() => handleSort('email')}
                    >
                      Email
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Questionario</TableCell>
                  <TableCell sortDirection={orderBy === 'createdAt' ? order : false} sx={{ whiteSpace: 'nowrap' }}>
                    <TableSortLabel
                      active={orderBy === 'createdAt'}
                      direction={orderBy === 'createdAt' ? order : 'asc'}
                      onClick={() => handleSort('createdAt')}
                    >
                      Creato il
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Azioni</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filtered.map((p) => (
                  <TableRow
                    key={p._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => openDrawerFor(p)}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{fullName(p)}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      {p.questionnaireDone ? (
                        <Chip label="Compilato" size="small" color="success" variant="outlined" />
                      ) : (
                        <Chip label="Non compilato" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(p.createdAt)}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        component={RouterLink}
                        to={`/therapist/patients/${p._id}`}
                        size="small"
                        variant="outlined"
                      >
                        Apri scheda
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Alert severity="info">Nessun paziente trovato.</Alert>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Drawer di anteprima */}
      <PatientDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        patient={selected}
      />
    </Box>
  );
}
