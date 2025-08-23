// frontend/src/pages/Profile.jsx
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Grid, Paper, TextField, Typography, Snackbar
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { me as fetchMe, updateMe } from '../api/auth';
import { useAuth } from '../context/AuthContext';

function formatDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function Profile() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const data = await fetchMe();
        if (!ok) return;
        setProfile({
          name: data.name || '',
          surname: data.surname || '',
          birthDate: formatDateInput(data.birthDate),
          email: data.email || '',
          questionnaireDone: Boolean(data.questionnaireDone),
        });
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Errore nel caricamento del profilo.');
      }
    })();
    return () => { ok = false; };
  }, []);

  async function onSave(e) {
    e.preventDefault();
    if (!profile || !editMode) return;
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: profile.name.trim(),
        surname: profile.surname.trim(),
        birthDate: profile.birthDate || null,
        email: profile.email.trim().toLowerCase(),
      };
      const updated = await updateMe(payload);
      setUser(prev => prev ? {
        ...prev,
        name: updated.name,
        surname: updated.surname,
        email: updated.email,
        birthDate: updated.birthDate
      } : prev);
      setSnack({ open: true, message: 'Profilo aggiornato.', severity: 'success' });
      setEditMode(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Errore aggiornamento profilo.';
      setError(msg);
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <Box className="container" sx={{ mt: 3, maxWidth: 720 }}>
        {error ? <Alert severity="error">{error}</Alert> : <Typography>Caricamento…</Typography>}
      </Box>
    );
  }

  const qDone = profile.questionnaireDone;

  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 720 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Area personale</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={onSave}>
          <Grid container spacing={2}>
            {/* Riga 1: Nome + Cognome */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome"
                value={profile.name}
                onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                required
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Cognome"
                value={profile.surname}
                onChange={(e) => setProfile(p => ({ ...p, surname: e.target.value }))}
                required
                fullWidth
                disabled={!editMode}
              />
            </Grid>

            {/* Riga 2: Data di nascita (mezza larghezza come i campi sopra) */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Data di nascita"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={profile.birthDate}
                onChange={(e) => setProfile(p => ({ ...p, birthDate: e.target.value }))}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={12} sm={6} /> {/* spacer */}

            {/* Riga 3: Email su riga dedicata + link password */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <TextField
                  label="Email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                  fullWidth
                  disabled={!editMode}
                />
                <Typography
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Password dimenticata?
                </Typography>
              </Box>
            </Grid>

            {/* Riga 4: Card stato questionario — stessa larghezza dei campi (sm=6) */}
            <Grid item xs={12} sm={6}>
              {qDone ? (
                <Alert
                  severity="success"
                  variant="standard"
                  sx={{ borderRadius: 2, alignItems: 'center' }}
                >
                  {/* testo NON in grassetto */}
                  Questionario completato
                </Alert>
              ) : (
                <Paper
                  elevation={0}
                  sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.200' }}
                >
                  <Typography variant="body2">Questionario non completato</Typography>
                </Paper>
              )}
            </Grid>
            <Grid item xs={12} sm={6} /> {/* spacer per allineamento */}

            {/* Pulsanti: più in basso e ancora più a destra */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 6, pr: 1 }}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => setEditMode(true)}
                  disabled={editMode}
                >
                  Modifica profilo
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!editMode || saving}
                >
                  {saving ? 'Salvataggio…' : 'Salva modifiche'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}



