// frontend/src/pages/therapist/Books.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Stack, Typography, TextField, Select, MenuItem, Button, Paper, Alert,
  IconButton, Tooltip, Card, CardContent, CardActions, Avatar, Divider, Skeleton, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  FormControl, InputLabel
} from '@mui/material';
import CachedIcon from '@mui/icons-material/Cached';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { listBooks, deleteBook } from '../../api/books';
import AssignMaterialDialog from '../../components/AssignMaterialDialog';

const CARD_HEIGHT = 240; // altezza fissa per tutte le card

export default function Books() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [orderBy, setOrderBy] = useState('updatedAt'); // 'updatedAt' | 'title'
  const [err, setErr] = useState('');

  // Assegna
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignItem, setAssignItem] = useState(null);

  // Elimina (Dialog)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listBooks({ q: q || undefined });
      setItems(Array.isArray(data) ? data : []);
      setErr('');
    } catch {
      setErr('Errore nel caricamento libri');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => {
    setQ('');
    setOrderBy('updatedAt');
    setTimeout(load, 0);
  };

  const openAssign = (item) => { setAssignItem(item); setAssignOpen(true); };
  const closeAssign = (didAssign) => {
    setAssignOpen(false);
    setAssignItem(null);
    if (didAssign) load();
  };

  // Apertura dialog elimina
  const askDelete = (item) => { setDeleteItem(item); setDeleteOpen(true); };
  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteItem(null);
  };
  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteBook(deleteItem._id);
      closeDelete();
      load();
    } finally {
      setDeleting(false);
    }
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

  return (
    <Box sx={{ p:2 }}>
     
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5">Libri</Typography>
        <Button variant="contained" onClick={() => navigate('/therapist/books/new')}>Nuovo libro</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        In catalogo: {items.length}
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

     
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <TextField
                label="Cerca per titolo, autore o ISBN"
                value={q}
                onChange={e => setQ(e.target.value)}
                sx={{ maxWidth: 360 }}
              />

              
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="book-order-by-label" shrink>Ordina per</InputLabel>
                <Select
                  labelId="book-order-by-label"
                  value={orderBy}
                  onChange={e => setOrderBy(e.target.value)}
                  label="Ordina per"
                >
                  <MenuItem value="updatedAt">Ultimo aggiornamento</MenuItem>
                  <MenuItem value="title">Titolo</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Grid>
          <Grid item>
            <Tooltip title="Reimposta">
              <IconButton onClick={resetFilters}><CachedIcon/></IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

    
      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} variant="outlined" sx={{ height: CARD_HEIGHT }}>
              <CardContent sx={{ height: '100%' }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ height: '100%' }}>
                  <Skeleton variant="rounded" width={48} height={64} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="30%" />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <>
          {!!sorted.length && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {sorted.map(b => (
                <Card
                  key={b._id}
                  variant="outlined"
                  sx={{ height: CARD_HEIGHT, display: 'flex', flexDirection: 'column' }}
                >
                  <CardContent sx={{ flexGrow: 1, pb: 1.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar variant="rounded" sx={{ width:48, height:64 }}>
                        <MenuBookIcon/>
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" noWrap title={b.title}>
                          {b.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                          title={`${b.author || '—'}${b.year ? ` • ${b.year}` : ''}`}
                        >
                          {(b.author || '—')}{b.year ? ` • ${b.year}` : ''}
                        </Typography>

                        {b.isbn && (
                          <Typography variant="caption" color="text.secondary" noWrap title={`ISBN ${b.isbn}`}>
                            ISBN {b.isbn}
                          </Typography>
                        )}

                        <Divider sx={{ mt: 1 }} />

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          title={`Aggiornato il ${new Date(b.updatedAt || b.createdAt).toLocaleDateString('it-IT')}`}
                        >
                          Aggiornato il {new Date(b.updatedAt || b.createdAt).toLocaleDateString('it-IT')}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>

                  
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Assegna">
                        <IconButton onClick={() => openAssign(b)} aria-label="assegna">
                          <PersonAddAlt1Icon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifica">
                        <IconButton
                          component={RouterLink}
                          to={`/therapist/books/${b._id}`}
                          aria-label="modifica"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>

                    <Tooltip title="Elimina">
                      <span>
                        <IconButton
                          color="error"
                          onClick={() => askDelete(b)}
                          aria-label="elimina"
                          disabled={deleting && deleteItem?._id === b._id}
                        >
                          {deleting && deleteItem?._id === b._id
                            ? <CircularProgress size={16} />
                            : <DeleteOutlineIcon />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}

          {!sorted.length && (
            <Paper variant="outlined" sx={{ p:4, mt: 1, borderStyle:'dashed', textAlign:'center' }}>
              <Stack spacing={1} alignItems="center">
                <MenuBookIcon fontSize="large" />
                <Typography color="text.secondary">Nessun libro in catalogo</Typography>
                <Button variant="contained" onClick={() => navigate('/therapist/books/new')}>Aggiungi libro</Button>
              </Stack>
            </Paper>
          )}
        </>
      )}

      <AssignMaterialDialog
        open={assignOpen}
        onClose={closeAssign}
        itemType="Book"
        item={assignItem}
      />

    
      <Dialog open={deleteOpen} onClose={closeDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminare questo libro?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            {deleteItem?.title || 'Questo elemento'} verrà rimosso dal catalogo.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            L’operazione non può essere annullata.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDelete} disabled={deleting}>Annulla</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : null}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
