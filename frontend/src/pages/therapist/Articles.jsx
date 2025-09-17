// frontend/src/pages/therapist/Articles.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Stack, Typography, TextField, Select, MenuItem, Button, Grid, Paper, Chip, Alert,
  IconButton, Tooltip, Card, CardContent, CardActions, Divider, Avatar, Skeleton,
  FormControl, InputLabel
} from '@mui/material';
import CachedIcon from '@mui/icons-material/Cached';
import ArticleIcon from '@mui/icons-material/Article';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { listArticles, deleteArticle } from '../../api/articles';
import AssignMaterialDialog from '../../components/AssignMaterialDialog';

function statusLabel(s) { return s === 'published' ? 'Pubblicato' : 'Bozza'; }

export default function Articles() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [orderBy, setOrderBy] = useState('updatedAt'); // 'updatedAt' | 'title'
  const [err, setErr] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignItem, setAssignItem] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listArticles({ q: q || undefined, status: status || undefined });
      setItems(Array.isArray(data) ? data : []);
      setErr('');
    } catch {
      setErr('Errore nel caricamento articoli');
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => {
    setQ('');
    setStatus('');
    setOrderBy('updatedAt');
    setTimeout(load, 0);
  };

  const openAssign = (item) => { setAssignItem(item); setAssignOpen(true); };
  const closeAssign = (didAssign) => {
    setAssignOpen(false);
    setAssignItem(null);
    if (didAssign) load();
  };

  // ordinamento client-side
  const sorted = useMemo(() => {
    const arr = [...items];
    if (orderBy === 'title') {
      arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'it', { sensitivity: 'base' }));
    } else {
      const ts = (x) => new Date(x?.updatedAt || x?.createdAt || 0).getTime();
      arr.sort((a, b) => ts(b) - ts(a));
    }
    return arr;
  }, [items, orderBy]);

  // KPI
  const kpi = useMemo(() => {
    const total = items.length;
    const published = items.filter(a => a.status === 'published').length;
    const drafts = items.filter(a => a.status !== 'published').length;
    return { total, published, drafts };
  }, [items]);

  const getExcerpt = (a) => a.excerpt || a.summary || a.description || '';

  return (
    <Box sx={{ p:2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5">Articoli</Typography>
        <Button variant="contained" onClick={() => navigate('/therapist/articles/new')}>Nuovo articolo</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Totale: {kpi.total}
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {/* KPI strip */}
      <Stack direction={{ xs:'column', sm:'row' }} spacing={2} sx={{ mb: 2 }}>
        <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 180 }}>
          <Typography variant="overline" color="text.secondary">Pubblicati</Typography>
          <Typography variant="h6">{kpi.published}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 180 }}>
          <Typography variant="overline" color="text.secondary">Bozze</Typography>
          <Typography variant="h6">{kpi.drafts}</Typography>
        </Paper>
      </Stack>

      {/* Toolbar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <TextField
                label="Cerca per titolo o tag"
                value={q}
                onChange={e => setQ(e.target.value)}
                sx={{ maxWidth: 360 }}
              />
              <Select value={status} onChange={e => setStatus(e.target.value)} displayEmpty sx={{ minWidth: 200 }} size="small">
                <MenuItem value=""><em>Tutti gli stati</em></MenuItem>
                <MenuItem value="draft">Bozza</MenuItem>
                <MenuItem value="published">Pubblicato</MenuItem>
              </Select>

              {/* ⬇️ Label nel bordo (notch) */}
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="order-by-label" shrink>Ordina per</InputLabel>
                <Select
                  labelId="order-by-label"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                  label="Ordina per"
                >
                  <MenuItem value="updatedAt">Ultimo aggiornamento</MenuItem>
                  <MenuItem value="title">Titolo </MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Grid>
          <Grid item>
            <Tooltip title="Reimposta filtri">
              <IconButton onClick={resetFilters}><CachedIcon/></IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Lista: UNA CARD PER RIGA */}
      {loading ? (
        <Stack spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="30%" />
                  </Box>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Skeleton variant="rectangular" height={60} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <>
          {!!sorted.length && (
            <Stack spacing={2}>
              {sorted.map(a => (
                <Card key={a._id} variant="outlined">
                  <CardContent>
                    {/* Header: avatar + titolo */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar>
                        <ArticleIcon/>
                      </Avatar>
                      <Typography variant="h6" noWrap sx={{ flex: 1, minWidth: 0 }}>
                        {a.title}
                      </Typography>
                    </Stack>

                    {/* Riga data + stato */}
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('it-IT') : '—'}
                      {' • '}{statusLabel(a.status)}
                    </Typography>

                    {/* Abstract */}
                    {getExcerpt(a) && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {getExcerpt(a)}
                        </Typography>
                      </>
                    )}

                    {/* Tag */}
                    {Array.isArray(a.tags) && a.tags.length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        {a.tags.map(t => <Chip key={t} size="small" label={t} />)}
                      </Stack>
                    )}
                  </CardContent>

                  {/* Azioni */}
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                    <Tooltip title="Assegna">
                      <IconButton onClick={() => openAssign(a)} aria-label="assegna">
                        <PersonAddAlt1Icon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Modifica">
                      <IconButton
                        component={RouterLink}
                        to={`/therapist/articles/${a._id}`}
                        aria-label="modifica"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina">
                      <IconButton
                        color="error"
                        onClick={async () => {
                          if (confirm('Eliminare questo articolo?')) {
                            await deleteArticle(a._id);
                            load();
                          }
                        }}
                        aria-label="elimina"
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              ))}
            </Stack>
          )}

          {!sorted.length && (
            <Paper variant="outlined" sx={{ p:4, mt: 1, borderStyle:'dashed', textAlign:'center' }}>
              <Stack spacing={1} alignItems="center">
                <ArticleIcon fontSize="large" />
                <Typography color="text.secondary">Nessun articolo trovato</Typography>
                <Button variant="contained" onClick={() => navigate('/therapist/articles/new')}>Crea articolo</Button>
              </Stack>
            </Paper>
          )}
        </>
      )}

      <AssignMaterialDialog
        open={assignOpen}
        onClose={closeAssign}
        itemType="Article"
        item={assignItem}
      />
    </Box>
  );
}
