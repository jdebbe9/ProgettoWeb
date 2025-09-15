// frontend/src/components/patients/AssignToPatientDialog.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  List, ListItemButton, ListItemText, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography
} from '@mui/material';
import { listArticles } from '../../api/articles';
import { listBooks } from '../../api/books';
import { createAssignment } from '../../api/assignments';

export default function AssignToPatientDialog({ open, onClose, patient, defaultType = 'Article' }) {
  const [itemType, setItemType] = useState(defaultType); // 'Article' | 'Book'
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  // reset when open changes
  useEffect(() => {
    if (open) {
      setQuery('');
      setItems([]);
      setSelected(null);
      setErr('');
    }
  }, [open]);

  // fetch items (debounced 300ms)
  useEffect(() => {
    if (!open) return;
    let cancel = false;
    const t = setTimeout(async () => {
      setLoading(true); setErr('');
      try {
        let data = [];
        if (itemType === 'Article') {
          // preferiamo solo pubblicati per il paziente
          data = await listArticles({ q: query, status: 'published' });
        } else {
          data = await listBooks({ q: query }); // tutti i libri dell’autore
        }
        if (!cancel) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancel) setErr(e?.response?.data?.message || 'Errore durante la ricerca.');
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 300);
    return () => { cancel = true; clearTimeout(t); };
  }, [open, query, itemType]);

  const title = useMemo(() => (
    itemType === 'Article' ? 'Assegna articolo' : 'Assegna libro'
  ), [itemType]);

  async function handleAssign() {
    if (!patient?._id || !selected?._id) return;
    setSaving(true); setErr('');
    try {
      await createAssignment({
        patientId: patient._id,
        itemType,
        itemId: selected._id,
      });
      onClose?.(true); // chiudi segnalando successo
    } catch (e) {
      setErr(e?.response?.data?.message || 'Impossibile completare l’assegnazione.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!open} onClose={() => onClose?.(false)} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Paziente: <b>{[patient?.name, patient?.surname].filter(Boolean).join(' ') || patient?.email}</b>
          </Typography>

          <ToggleButtonGroup
            exclusive
            value={itemType}
            onChange={(_, v) => v && setItemType(v)}
            size="small"
          >
            <ToggleButton value="Article">Articoli</ToggleButton>
            <ToggleButton value="Book">Libri</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label={itemType === 'Article' ? 'Cerca articoli' : 'Cerca libri'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Titolo, tag…"
          />

          {err && <Alert severity="error">{err}</Alert>}

          {loading ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={20} /> <span>Caricamento…</span>
            </Stack>
          ) : (
            <List dense disablePadding>
              {items.length === 0 && (
                <Typography variant="body2" color="text.secondary">Nessun risultato.</Typography>
              )}
              {items.map(it => {
                const primary = it.title || it.name || '(senza titolo)';
                const secondary = [
                  it.status ? `Stato: ${it.status}` : null,
                  it.tags && it.tags.length ? `Tag: ${it.tags.join(', ')}` : null
                ].filter(Boolean).join(' — ');
                const selectedId = selected?._id;
                const isSel = selectedId && String(selectedId) === String(it._id);
                return (
                  <ListItemButton
                    key={it._id}
                    selected={!!isSel}
                    onClick={() => setSelected(it)}
                  >
                    <ListItemText primary={primary} secondary={secondary} />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose?.(false)} disabled={saving}>Annulla</Button>
        <Button onClick={handleAssign} variant="contained" disabled={saving || !selected}>
          {saving ? 'Assegno…' : 'Assegna'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
