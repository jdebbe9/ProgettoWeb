// frontend/src/pages/Profile.jsx
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Grid, Paper, TextField, Typography, Snackbar,
  IconButton, Checkbox, FormControlLabel, Link as MuiLink
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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

// Heuristica: separa "via xx" in { street, number }
function splitAddress(full) {
  const s = String(full || '').trim();
  if (!s) return { street: '', number: '' };
  const m = s.match(/^(.+?)\s+(\d+[A-Za-z]?)$/); // prende numero finale con eventuale lettera
  if (m) return { street: m[1], number: m[2] };
  return { street: s, number: '' };
}

const EMPTY_EC = { name: '', relation: '', phone: '', email: '', consent: false };

export default function Profile() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  // campi separati per indirizzo
  const [addrStreet, setAddrStreet] = useState('');
  const [addrNumber, setAddrNumber] = useState('');

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const data = await fetchMe();
        if (!ok) return;
        const { street, number } = splitAddress(data.address);
        setAddrStreet(street);
        setAddrNumber(number);

        setProfile({
          name: data.name || '',
          surname: data.surname || '',
          birthDate: formatDateInput(data.birthDate),
          email: data.email || '',
          questionnaireDone: Boolean(data.questionnaireDone),

          // aggiuntivi
          city: data.city || '',
          cap: data.cap || '',
          phone: data.phone || '',

          emergencyContacts:
            Array.isArray(data.emergencyContacts) && data.emergencyContacts.length
              ? data.emergencyContacts.map(c => ({
                  name: c?.name || '',
                  relation: c?.relation || '',
                  phone: c?.phone || '',
                  email: c?.email || '',
                  consent: !!c?.consent
                }))
              : [{ ...EMPTY_EC }],
        });
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Errore nel caricamento del profilo.');
      }
    })();
    return () => { ok = false; };
  }, []);

  const profileComplete = !!(
    profile &&
    (profile.name || '').trim() &&
    (profile.surname || '').trim() &&
    (profile.email || '').trim() &&
    addrStreet.trim() &&
    (profile.city || '').trim() &&
    (profile.cap || '').trim() &&
    (profile.phone || '').trim()
  );

  function updateField(field, value) {
    setProfile(p => ({ ...p, [field]: value }));
  }

  function updateEC(idx, field, value) {
    setProfile(p => {
      const list = [...(p.emergencyContacts || [])];
      list[idx] = { ...list[idx], [field]: value };
      return { ...p, emergencyContacts: list };
    });
  }

  function addEC() {
    setProfile(p => {
      const list = [...(p.emergencyContacts || [])];
      if (list.length >= 2) return p;
      list.push({ ...EMPTY_EC });
      return { ...p, emergencyContacts: list };
    });
  }

  function removeEC(idx) {
    setProfile(p => {
      let list = [...(p.emergencyContacts || [])];
      list.splice(idx, 1);
      if (list.length === 0) list = [{ ...EMPTY_EC }];
      return { ...p, emergencyContacts: list };
    });
  }

  async function onSave(e) {
    e.preventDefault();
    if (!profile || !editMode) return;
    setError('');
    setSaving(true);
    try {
      const addressCombined = `${addrStreet} ${addrNumber}`.trim();
      const payload = {
        name: profile.name.trim(),
        surname: profile.surname.trim(),
        birthDate: profile.birthDate || null,
        email: profile.email.trim().toLowerCase(),

        address: addressCombined,
        city: (profile.city || '').trim(),
        cap: (profile.cap || '').trim(),
        phone: (profile.phone || '').trim(),

        emergencyContacts: (profile.emergencyContacts || [])
          .slice(0, 2)
          .map(c => ({
            name: String(c?.name || '').trim(),
            relation: String(c?.relation || '').trim(),
            phone: String(c?.phone || '').trim(),
            email: String(c?.email || '').trim(),
            consent: !!c?.consent
          }))
          .filter(c => c.name && c.phone),
      };

      const updated = await updateMe(payload);

      // aggiorna auth context
      setUser(prev => prev ? {
        ...prev,
        name: updated.name,
        surname: updated.surname,
        email: updated.email,
        birthDate: updated.birthDate
      } : prev);

      setSnack({ open: true, message: 'Profilo aggiornato.', severity: 'success' });
      setEditMode(false);
    } catch (e2) {
      const msg = e2?.response?.data?.message || e2?.message || 'Errore aggiornamento profilo.';
      setError(msg);
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <Box className="container" sx={{ mt: 3 }}>
        {error ? <Alert severity="error">{error}</Alert> : <Typography>Caricamento…</Typography>}
      </Box>
    );
  }

  const qDone = profile.questionnaireDone;

  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Area personale</Typography>

      {!profileComplete && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Completa il tuo profilo</strong> per poter prenotare appuntamenti e usare tutte le funzioni.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Card più a sinistra, larghezza controllata */}
      <Paper sx={{ p: 3, maxWidth: 720, ml: 0 }}>
        <form onSubmit={onSave}>
          <Grid container spacing={2}>
            {/* 1) Nome (a capo) */}
            <Grid item xs={12}>
              <TextField
                label="Nome"
                value={profile.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                fullWidth
                disabled={!editMode}
              />
            </Grid>

            {/* 2) Cognome (a capo) */}
            <Grid item xs={12}>
              <TextField
                label="Cognome"
                value={profile.surname}
                onChange={(e) => updateField('surname', e.target.value)}
                required
                fullWidth
                disabled={!editMode}
              />
            </Grid>

            {/* 3) Data di nascita (a capo) */}
            <Grid item xs={12}>
              <TextField
                label="Data di nascita"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={profile.birthDate}
                onChange={(e) => updateField('birthDate', e.target.value)}
                fullWidth
                disabled={!editMode}
              />
            </Grid>

            {/* 4) Email (a capo) */}
            <Grid item xs={12}>
              <TextField
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) => updateField('email', e.target.value)}
                fullWidth
                disabled={!editMode}
              />
            </Grid>

            {/* 5) Password (a capo) – campo non editabile qui, link a cambio password */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <TextField
                  label="Password"
                  type="password"
                  value="********"
                  disabled
                  fullWidth
                />
                <MuiLink component={RouterLink} to="/forgot-password" variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                  Cambia
                </MuiLink>
              </Box>
            </Grid>

            {/* 6) Città + CAP sulla stessa riga */}
            <Grid item xs={8}>
              <TextField
                label="Città"
                value={profile.city}
                onChange={(e) => updateField('city', e.target.value)}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="CAP"
                value={profile.cap}
                onChange={(e) => updateField('cap', e.target.value)}
                fullWidth
                disabled={!editMode}
              />
            </Grid>

            {/* 7) Indirizzo + Numero civico sulla stessa riga */}
            <Grid item xs={8}>
              <TextField
                label="Indirizzo (via)"
                value={addrStreet}
                onChange={(e) => setAddrStreet(e.target.value)}
                fullWidth
                disabled={!editMode}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Numero civico"
                value={addrNumber}
                onChange={(e) => setAddrNumber(e.target.value)}
                fullWidth
                disabled={!editMode}
              />
            </Grid>

            {/* 8) Telefono (a capo) */}
            <Grid item xs={12}>
              <TextField
                label="Telefono"
                value={profile.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                fullWidth
                disabled={!editMode}
              />
            </Grid>

            {/* 9) Questionario completato (a capo) */}
            <Grid item xs={12}>
              {qDone ? (
                <Alert severity="success" variant="standard" sx={{ borderRadius: 2, alignItems: 'center' }}>
                  Questionario completato
                </Alert>
              ) : (
                <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                  Questionario non completato
                </Alert>
              )}
            </Grid>

            {/* Pulsanti azione */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
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

      {/* Contatti di emergenza (spazio extra) */}
      <Paper sx={{ p: 3, maxWidth: 720, mt: 4, ml: 0 }}>
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
          Contatti di emergenza
        </Typography>

        {(profile.emergencyContacts || []).map((c, idx) => (
          <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  label="Nome e cognome"
                  value={c.name}
                  onChange={(e)=>updateEC(idx,'name', e.target.value)}
                  fullWidth
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Relazione"
                  placeholder="es. Partner"
                  value={c.relation}
                  onChange={(e)=>updateEC(idx,'relation', e.target.value)}
                  fullWidth
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Telefono"
                  value={c.phone}
                  onChange={(e)=>updateEC(idx,'phone', e.target.value)}
                  fullWidth
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Email (facoltativa)"
                  value={c.email}
                  onChange={(e)=>updateEC(idx,'email', e.target.value)}
                  fullWidth
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!c.consent}
                      onChange={(e)=>updateEC(idx,'consent', e.target.checked)}
                      disabled={!editMode}
                    />
                  }
                  label="Autorizzo il terapeuta a contattare questa persona solo in caso di emergenza"
                />
              </Grid>
              <Grid item xs={12} md="auto">
                <IconButton
                  aria-label="Rimuovi contatto"
                  onClick={()=>removeEC(idx)}
                  disabled={!editMode}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Grid>
            </Grid>
          </Paper>
        ))}

        <Button
          startIcon={<AddIcon />}
          onClick={addEC}
          disabled={!editMode || (profile.emergencyContacts || []).length >= 2}
        >
          Aggiungi contatto (max 2)
        </Button>
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



