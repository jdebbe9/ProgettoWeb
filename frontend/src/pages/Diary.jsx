// frontend/src/pages/Diary.jsx
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Stack, TextField, Typography, FormControlLabel, Checkbox, Chip
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { listDiary, createDiary } from '../api/diary'; // niente update/delete

const schema = z.object({
  content: z.string().trim().min(1, 'Il contenuto è obbligatorio').max(5000, 'Massimo 5000 caratteri')
});

export default function Diary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [shared, setShared] = useState(true); // ⬅️ nuovo: privacy per la voce

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { content: '' }
  });

  async function load() {
    setError('');
    setLoading(true);
    try {
      const data = await listDiary();
      setItems(data?.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nel caricamento del diario.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onSubmit = async (data) => {
    setError('');
    try {
      // ⬇️ includo il flag di condivisione
      await createDiary({ content: data.content, shared });
      handleClose();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nel salvataggio.');
    }
  };

  function handleOpen() {
    reset({ content: '' });
    setShared(true); // default: condivisa
    setIsCreating(true);
  }

  function handleClose() {
    setIsCreating(false);
  }

  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 800 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Il mio Diario</Typography>
        <Button variant="contained" onClick={handleOpen}>Nuova Voce</Button>
      </Box>
      <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
        Scrivi i tuoi pensieri ed emozioni. Puoi scegliere se condividere la voce con il terapeuta.
        Una volta salvata, la voce non potrà essere modificata o cancellata.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '20vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {items.length === 0 && <Typography>Nessuna voce nel diario.</Typography>}
          {items.map(entry => (
            <Paper key={entry._id} sx={{ p: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  {new Date(entry.createdAt).toLocaleString('it-IT')}
                </Typography>
                {/* Chip “Privato” solo quando non condivisa (retrocompatibilità: undefined = condivisa) */}
                {entry.shared === false && <Chip size="small" label="Privato" />}
              </Box>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{entry.content}</Typography>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Dialog per creare */}
      <Dialog open={isCreating} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Nuova Voce del Diario</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  multiline
                  minRows={8}
                  fullWidth
                  label="Contenuto"
                  error={!!errors.content}
                  helperText={errors.content?.message}
                  autoFocus
                />
              )}
            />
            {/* Toggle privacy */}
            <FormControlLabel
              sx={{ mt: 1 }}
              control={<Checkbox checked={shared} onChange={(e)=>setShared(e.target.checked)} />}
              label="Condividi col terapeuta"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Annulla</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

