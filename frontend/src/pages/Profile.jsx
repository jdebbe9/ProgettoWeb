// frontend/src/pages/Profile.jsx
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Grid, Paper, TextField, Typography, Snackbar,
  IconButton, Checkbox, FormControlLabel, Link as MuiLink
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link as RouterLink } from 'react-router-dom';
import { getMe as fetchMe, updateMe } from '../api/user'; // ✅ API corrette
import { useAuth } from '../context/AuthContext';

/* ---------------- utils ---------------- */
function formatDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Parser indirizzo robusto
function splitAddress(full) {
  const s = String(full || '').trim().replace(/,\s*$/, '');
  if (!s) return { street: '', number: '' };
  let m = s.match(/^(.+?)\s+(\d+[A-Za-z]?(?:[/-]\d+[A-Za-z]?)?)$/); // 12, 12A, 12/A, 12-14
  if (m) return { street: m[1], number: m[2] };
  m = s.match(/^(.+?)\s+(\d+)\s+(bis|ter|quater)$/i); // 12 bis
  if (m) return { street: m[1], number: `${m[2]} ${m[3].toLowerCase()}` };
  const tokens = s.split(/\s+/);
  for (let i = tokens.length - 1; i >= 0; i--) if (/\d/.test(tokens[i]))
    return { street: tokens.slice(0, i).join(' '), number: tokens.slice(i).join(' ') };
  return { street: s, number: '' };
}

// ⚙️ stesso criterio del virtual Mongoose user.profileComplete
function computeProfileCompleteLocal({ name, surname, email, city, cap, phone, address }) {
  const has = v => typeof v === 'string' && v.trim().length > 0;
  return has(name) && has(surname) && has(email) && has(city) && has(address) && has(cap) && has(phone);
}

const EMPTY_EC = { name: '', relation: '', phone: '', email: '', consent: false };

function toProfileStateFromServer(data) {
  const { street, number } = splitAddress(data.address);
  return {
    name: data.name || '',
    surname: data.surname || '',
    birthDate: formatDateInput(data.birthDate),
    email: data.email || '',
    questionnaireDone: !!data.questionnaireDone,
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
    __addrStreet: street,
    __addrNumber: number,
  };
}

/* --------------- component --------------- */
export default function Profile() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [addrStreet, setAddrStreet] = useState('');
  const [addrNumber, setAddrNumber] = useState('');

  // Load iniziale
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchMe();
        if (!mounted) return;
        const p = toProfileStateFromServer(data);
        setProfile({
          name: p.name, surname: p.surname, birthDate: p.birthDate, email: p.email,
          questionnaireDone: p.questionnaireDone, city: p.city, cap: p.cap, phone: p.phone,
          emergencyContacts: p.emergencyContacts,
        });
        setAddrStreet(p.__addrStreet);
        setAddrNumber(p.__addrNumber);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Errore nel caricamento del profilo.');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const profileCompleteLocalFlag = !!(
    profile &&
    computeProfileCompleteLocal({
      ...profile,
      address: `${addrStreet} ${addrNumber}`.trim(),
    })
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
        name: (profile.name || '').trim(),
        surname: (profile.surname || '').trim(),
        birthDate: (profile.birthDate || '') || null,
        email: (profile.email || '').trim().toLowerCase(),
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
          .filter(c => c.name && c.phone), // coerente con lo schema
      };

      // Salva lato server
      await updateMe(payload);

      // Provo a ricaricare dal server (se fallisce, userò i dati locali)
      let fresh = null;
      try { fresh = await fetchMe(); } catch { /* fallback a dati locali */ }

      // Calcolo profileComplete in LOCALE per aggiornare SUBITO il contesto
      const basis = fresh || { ...payload, questionnaireDone: profile.questionnaireDone };
      const computedComplete = computeProfileCompleteLocal({
        name: basis.name, surname: basis.surname, email: basis.email,
        city: basis.city, cap: basis.cap, phone: basis.phone, address: basis.address,
      });

      // Aggiorno AuthContext immediatamente (sblocca Appuntamenti)
      setUser(prev => {
        const merged = { ...(prev || {}), ...(fresh || {}), profileComplete: computedComplete };
        return merged;
      });

      // Aggiorno stato locale con i dati (preferisci server se disponibile)
      if (fresh) {
        const p = toProfileStateFromServer(fresh);
        setProfile({
          name: p.name, surname: p.surname, birthDate: p.birthDate, email: p.email,
          questionnaireDone: p.questionnaireDone, city: p.city, cap: p.cap, phone: p.phone,
          emergencyContacts: p.emergencyContacts,
        });
        setAddrStreet(p.__addrStreet);
        setAddrNumber(p.__addrNumber);
      } else {
        // fallback: allinea dallo stesso payload
        setProfile(p => ({ ...p, ...payload }));
      }

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

      {!profileCompleteLocalFlag && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Completa il tuo profilo</strong> per poter prenotare appuntamenti e usare tutte le funzioni.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Card principale */}
      <Paper sx={{ p: 3, maxWidth: 720, ml: 0 }}>
        <form onSubmit={onSave}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Nome" value={profile.name} onChange={(e)=>updateField('name', e.target.value)} required fullWidth disabled={!editMode} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Cognome" value={profile.surname} onChange={(e)=>updateField('surname', e.target.value)} required fullWidth disabled={!editMode} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Data di nascita" type="date" InputLabelProps={{ shrink: true }} value={profile.birthDate} onChange={(e)=>updateField('birthDate', e.target.value)} fullWidth disabled={!editMode} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Email" type="email" value={profile.email} onChange={(e)=>updateField('email', e.target.value)} fullWidth disabled={!editMode} />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <TextField label="Password" type="password" value="********" disabled fullWidth />
                <MuiLink component={RouterLink} to="/forgot-password" variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                  Cambia
                </MuiLink>
              </Box>
            </Grid>
            <Grid item xs={8}>
              <TextField label="Città" value={profile.city} onChange={(e)=>updateField('city', e.target.value)} fullWidth disabled={!editMode} />
            </Grid>
            <Grid item xs={4}>
              <TextField label="CAP" value={profile.cap} onChange={(e)=>updateField('cap', e.target.value)} fullWidth disabled={!editMode} />
            </Grid>
            <Grid item xs={8}>
              <TextField label="Indirizzo (via)" value={addrStreet} onChange={(e)=>setAddrStreet(e.target.value)} fullWidth disabled={!editMode} />
            </Grid>
            <Grid item xs={4}>
              <TextField label="Numero civico" value={addrNumber} onChange={(e)=>setAddrNumber(e.target.value)} fullWidth disabled={!editMode} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Telefono" value={profile.phone} onChange={(e)=>updateField('phone', e.target.value)} fullWidth disabled={!editMode} />
            </Grid>
            <Grid item xs={12}>
              {qDone ? (
                <Alert severity="success" variant="standard" sx={{ borderRadius: 2, alignItems: 'center' }}>Questionario completato</Alert>
              ) : (
                <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>Questionario non completato</Alert>
              )}
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                <Button type="button" variant="outlined" onClick={()=>setEditMode(true)} disabled={editMode}>Modifica profilo</Button>
                <Button type="submit" variant="contained" disabled={!editMode || saving}>{saving ? 'Salvataggio…' : 'Salva modifiche'}</Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Contatti di emergenza */}
      <Paper sx={{ p: 3, maxWidth: 720, mt: 4, ml: 0 }}>
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>Contatti di emergenza</Typography>
        {(profile.emergencyContacts || []).map((c, idx) => (
          <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField label="Nome e cognome" value={c.name} onChange={(e)=>updateEC(idx,'name', e.target.value)} fullWidth disabled={!editMode} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Relazione" placeholder="es. Partner" value={c.relation} onChange={(e)=>updateEC(idx,'relation', e.target.value)} fullWidth disabled={!editMode} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Telefono" value={c.phone} onChange={(e)=>updateEC(idx,'phone', e.target.value)} fullWidth disabled={!editMode} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField label="Email (facoltativa)" value={c.email} onChange={(e)=>updateEC(idx,'email', e.target.value)} fullWidth disabled={!editMode} />
              </Grid>
              <Grid item xs={12} md={8}>
                <FormControlLabel
                  control={<Checkbox checked={!!c.consent} onChange={(e)=>updateEC(idx,'consent', e.target.checked)} disabled={!editMode} />}
                  label="Autorizzo il terapeuta a contattare questa persona solo in caso di emergenza"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <IconButton aria-label="Rimuovi contatto" onClick={()=>removeEC(idx)} disabled={!editMode}><DeleteOutlineIcon /></IconButton>
              </Grid>
            </Grid>
          </Paper>
        ))}
        <Button startIcon={<AddIcon />} onClick={addEC} disabled={!editMode || (profile.emergencyContacts || []).length >= 2}>
          Aggiungi contatto (max 2)
        </Button>
      </Paper>

      <Snackbar open={snack.open} autoHideDuration={2500} onClose={()=>setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} sx={{ width: '100%' }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
