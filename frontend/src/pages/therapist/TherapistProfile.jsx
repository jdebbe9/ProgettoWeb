// src/pages/therapist/TherapistProfile.jsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert, Box, Button, Checkbox, FormControlLabel, Grid, IconButton,
  Paper, Snackbar, TextField, Tooltip, Typography, Divider, Stack, Link as MuiLink
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { updateMe } from '../../api/auth';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
const devWarn = (...args) => { if (isDev) console.warn('[TherapistProfile]', ...args); };

// Fallback da .env frontend (se vuoi usarli, definiscili in .env.*)
const ENV_SURNAME   = import.meta.env?.VITE_THERAPIST_SURNAME || '';
const ENV_BIRTHDATE = import.meta.env?.VITE_THERAPIST_BIRTHDATE || ''; // accetta YYYY-MM-DD o DD/MM/YYYY

// Normalizza in YYYY-MM-DD
function normalizeDate(value) {
  if (!value) return '';
  // già ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // DD/MM/YYYY
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // tenta parse standard
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

const schema = z.object({
  name: z.string().min(2, 'Min 2 caratteri'),
  surname: z.string().min(2, 'Min 2 caratteri'),
  birthDate: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Data non valida'),
  email: z.string().email('Email non valida')
});

// utili localStorage per sezione “Studio”
const LS_KEY = (uid) => `therapist:studio:${uid || 'unknown'}`;
function loadStudio(uid) {
  try {
    const raw = localStorage.getItem(LS_KEY(uid));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    devWarn('loadStudio failed', e);
    return null;
  }
}
function saveStudio(uid, obj) {
  try {
    localStorage.setItem(LS_KEY(uid), JSON.stringify(obj ?? {}));
  } catch (e) {
    devWarn('saveStudio failed', e);
  }
}

export default function TherapistProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const isTherapist = user?.role === 'therapist';
  const therapistId = user?._id || user?.id || '';

  // default values con fallback da env se il profilo non ha i campi
  const defaultSurname   = (user?.surname && String(user.surname)) || ENV_SURNAME || '';
  const defaultBirthDate = normalizeDate(
    (user?.birthDate && new Date(user.birthDate).toISOString().slice(0, 10)) || ENV_BIRTHDATE
  );

  // ====== DATI PERSONALI (server) ======
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || '',
      surname: defaultSurname,
      birthDate: defaultBirthDate,
      email: user?.email || ''
    }
  });

  // allineo form quando cambia utente
  useEffect(() => {
    if (!user) return;
    reset({
      name: user?.name || '',
      surname: (user?.surname && String(user.surname)) || ENV_SURNAME || '',
      birthDate: normalizeDate(
        (user?.birthDate && new Date(user.birthDate).toISOString().slice(0, 10)) || ENV_BIRTHDATE
      ),
      email: user?.email || ''
    });
  }, [user, reset]);

  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false); // modalità modifica

  const onSubmit = async (v) => {
    setError('');
    try {
      const updated = await updateMe({
        name: v.name,
        surname: v.surname,
        birthDate: v.birthDate,
        email: v.email
      });
      // aggiorna contesto
      setUser?.(prev => ({ ...prev, ...updated }));
      setSaved(true);
      setEditing(false);
    } catch (e) {
      setError(e?.response?.data?.message || 'Salvataggio non riuscito.');
    }
  };

  // ====== STUDIO & PREFERENZE (locale) ======
  const [studio, setStudio] = useState(() =>
    loadStudio(therapistId) || {
      businessName: '',
      vatNumber: '',
      phone: '',
      address: '',
      website: '',
      notes: ''
    }
  );
  const [prefSound, setPrefSound] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pref_notify_sound') ?? 'true'); }
    catch { return true; }
  });
  const [prefDesktop, setPrefDesktop] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pref_notify_desktop') ?? 'false'); }
    catch { return false; }
  });
  const [studioSaved, setStudioSaved] = useState(false);

  // ricarica studio se cambia utente
  useEffect(() => {
    const loaded = loadStudio(therapistId);
    if (loaded) setStudio(loaded);
  }, [therapistId]);

  const handleStudioChange = (field, value) => {
    setStudio((s) => ({ ...s, [field]: value }));
  };
  const saveStudioPrefs = () => {
    saveStudio(therapistId, studio);
    try { localStorage.setItem('pref_notify_sound', JSON.stringify(!!prefSound)); } catch (e) { devWarn(e); }
    try { localStorage.setItem('pref_notify_desktop', JSON.stringify(!!prefDesktop)); } catch (e) { devWarn(e); }
    setStudioSaved(true);
  };
  const requestDesktopPerm = async (checked) => {
    setPrefDesktop(checked);
    if (checked && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); }
      catch (e) { devWarn('Notification.requestPermission failed', e); }
    }
  };

  if (!isTherapist) {
    return (
      <Box className="container" sx={{ mt: 3 }}>
        <Alert severity="warning">Questa pagina è riservata al terapeuta.</Alert>
      </Box>
    );
  }

  return (
    <Box className="container" sx={{ mt: 2, maxWidth: 1000 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h5">Area Personale</Typography>

        {/* Azioni profilo */}
        {!editing ? (
          <Button
            startIcon={<EditIcon />}
            variant="outlined"
            onClick={() => setEditing(true)}
          >
            Modifica profilo
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<CancelIcon />}
              variant="text"
              onClick={() => {
                // ripristina valori originali e chiudi editing
                reset();
                setEditing(false);
              }}
            >
              Annulla
            </Button>
            <Button
              startIcon={<SaveIcon />}
              variant="contained"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvo…' : 'Salva modifiche'}
            </Button>
          </Stack>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {/* ===== Dati personali ===== */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="row">
                <TextField
                  label="Nome"
                  fullWidth
                  sx={{ mr: 1 }}
                  {...register('name')}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  disabled={!editing}
                />
                <TextField
                  label="Cognome"
                  fullWidth
                  sx={{ mr: 1 }}                  // <-- bordo/spaziatura uniforme
                  {...register('surname')}
                  error={!!errors.surname}
                  helperText={errors.surname?.message}
                  disabled={!editing}
                />
              </div>

              <TextField
                label="Data di nascita"
                type="date"
                InputLabelProps={{ shrink: true }}
                {...register('birthDate')}
                error={!!errors.birthDate}
                helperText={errors.birthDate?.message}
                disabled={!editing}
              />

              <TextField
                label="Email"
                type="email"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={!editing}
              />

              {/* Campo password (solo link modifica) */}
              <TextField
                label="Password"
                type="password"
                value="********"
                disabled
                helperText={
                  <MuiLink component={RouterLink} to="/forgot-password">
                    Cambia password
                  </MuiLink>
                }
              />
            </form>
          </Paper>
        </Grid>

        {/* ===== Studio & Preferenze ===== */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Studio e preferenze</Typography>

            {/* Info Studio (locali) */}
            <Typography variant="subtitle2" sx={{ opacity: .8, mb: 1 }}>Informazioni Studio </Typography>
            <TextField
              label="Nome studio"
              value={studio.businessName}
              onChange={(e) => handleStudioChange('businessName', e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
            <TextField
              label="Partita IVA"
              value={studio.vatNumber}
              onChange={(e) => handleStudioChange('vatNumber', e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
            <TextField
              label="Telefono studio"
              value={studio.phone}
              onChange={(e) => handleStudioChange('phone', e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
            <TextField
              label="Indirizzo"
              value={studio.address}
              onChange={(e) => handleStudioChange('address', e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
            <TextField
              label="Sito web"
              value={studio.website}
              onChange={(e) => handleStudioChange('website', e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
            <TextField
              label="Note pubbliche"
              value={studio.notes}
              onChange={(e) => handleStudioChange('notes', e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />

            <Divider sx={{ my: 2 }} />

            {/* Preferenze locali */}
            <Typography variant="subtitle2" sx={{ opacity: .8, mb: .5 }}>Preferenze locali</Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!prefSound}
                  onChange={(e) => setPrefSound(e.target.checked)}
                />
              }
              label="Suono alla ricezione di una notifica"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!prefDesktop}
                  onChange={(e) => requestDesktopPerm(e.target.checked)}
                />
              }
              label="Prova a mostrare notifiche desktop"
            />

            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={saveStudioPrefs}>
                Salva impostazioni
              </Button>
              <Button
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                onClick={() => navigate('/therapist/dashboard')}
              >
                Vai alla Dashboard
              </Button>
              <Button
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                onClick={() => navigate('/therapist/schedule')}
              >
                Apri Agenda
              </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* ID & copia */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="body2" sx={{ opacity: .7 }}>ID terapeuta:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{therapistId}</Typography>
              <Tooltip title="Copia">
                <IconButton
                  size="small"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(String(therapistId || '')); }
                    catch (e) { devWarn('Clipboard copy failed', e); }
                  }}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() => setSaved(false)}
        message="Profilo aggiornato"
      />
      <Snackbar
        open={studioSaved}
        autoHideDuration={2000}
        onClose={() => setStudioSaved(false)}
        message="Impostazioni studio salvate"
      />
    </Box>
  );
}



