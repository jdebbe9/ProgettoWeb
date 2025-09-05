// frontend/src/components/AssignMaterialDialog.jsx
import { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, TextField, Alert, CircularProgress, List, ListItemButton, ListItemText, Typography
} from '@mui/material';
import { createAssignment } from '../api/assignments';
import { searchPatients } from '../api/therapists';

export default function AssignMaterialDialog({ open, onClose, itemType, item }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef();

  useEffect(()=>{
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setErr('');
    }
  }, [open]);

  // ricerca con debounce, prefisso nome/cognome
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setErr('');
      try {
        const list = await searchPatients({ q, limit: 10 });
        setResults(list);
      } catch  {
        setErr('Errore nella ricerca pazienti.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  const handleAssign = async () => {
  const pid = selected && (selected._id || selected.id);
  const iid = item && item._id;

  if (!pid) {
    setErr('Seleziona un paziente dai risultati.');
    return;
  }
  if (!iid) {
    setErr('Elemento non valido. Chiudi e riapri la finestra, poi riprova.');
    return;
  }
  if (saving) return; // evita doppio submit

  setSaving(true);
  setErr('');
  try {
    await createAssignment({
      patientId: String(pid),
      itemType: itemType === 'Book' ? 'Book' : 'Article', // normalizza
      itemId: String(iid),
      note: ''
    });
    onClose?.(true);
  } catch (e) {
    const status = e?.response?.status;
    const serverMsg = e?.response?.data?.message;

    if (status === 409) {
      setErr('Questo materiale è già stato assegnato a questo paziente.');
    } else if (status === 400) {
      setErr(serverMsg || 'Dati incompleti. Controlla i campi e riprova.');
    } else if (status === 403) {
      setErr('Non sei autorizzato ad assegnare questo materiale.');
    } else if (status === 404) {
      setErr(serverMsg || 'Elemento non trovato.');
    } else {
      setErr(serverMsg || 'Impossibile assegnare questo materiale.');
    }
  } finally {
    setSaving(false);
  }
};


  const title = itemType === 'Article' ? 'Assegna articolo' : 'Assegna libro';

  return (
    <Dialog open={open} onClose={() => onClose?.(false)} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {!!item?.title && (
            <TextField label="Titolo" value={item.title} size="small" InputProps={{ readOnly: true }} />
          )}

          <Typography variant="body2" color="text.secondary">
            Cerca e seleziona un paziente digitando <strong>nome o cognome</strong> (prefisso).
          </Typography>

          <TextField
            autoFocus
            label="Cerca paziente"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Es. Vito, Marco, Rossi…"
          />

          {err && <Alert severity="error">{err}</Alert>}

          {loading ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={20} /> <span>Ricerca in corso…</span>
            </Stack>
          ) : (
            <List dense disablePadding>
              {results.map(p => {
                const id = p._id || p.id;
                const primary = [p.name, p.surname].filter(Boolean).join(' ').trim() || id;
                const selectedId = selected?._id || selected?.id;
                const isSel = selectedId && String(selectedId) === String(id);
                return (
                  <ListItemButton
                    key={id}
                    selected={!!isSel}
                    onClick={() => setSelected(p)}
                  >
                    <ListItemText primary={primary} />
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
