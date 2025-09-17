// frontend/src/pages/Profile.jsx
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Paper, TextField, Typography, Snackbar,
  IconButton, Checkbox, FormControlLabel, InputAdornment, Tooltip, Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EditIcon from '@mui/icons-material/Edit';
import { getMe as fetchMe, updateMe } from '../api/user';
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
function splitAddress(full) {
  const s = String(full || '').trim().replace(/,\s*$/, '');
  if (!s) return { street: '', number: '' };
  let m = s.match(/^(.+?)\s+(\d+[A-Za-z]?(?:[/-]\d+[A-Za-z]?)?)$/);
  if (m) return { street: m[1], number: m[2] };
  m = s.match(/^(.+?)\s+(\d+)\s+(bis|ter|quater)$/i);
  if (m) return { street: m[1], number: `${m[2]} ${m[3].toLowerCase()}` };
  const tokens = s.split(/\s+/);
  for (let i = tokens.length - 1; i >= 0; i--) if (/\d/.test(tokens[i]))
    return { street: tokens.slice(0, i).join(' '), number: tokens.slice(i).join(' ') };
  return { street: s, number: '' };
}
// profilo completo (telefono escluso)
function computeProfileCompleteLocal({ name, surname, email, city, cap, address }) {
  const has = v => typeof v === 'string' && v.trim().length > 0;
  return has(name) && has(surname) && has(email) && has(city) && has(address) && has(cap);
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

/* ---- “InfoField”: testo in view, TextField in edit, stessa larghezza ---- */
function InfoField({ label, value, onChange, type = 'text', editMode = false, placeholder }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '.08em' }}>
        {label}
      </Typography>
      {editMode ? (
        <TextField
          fullWidth
          type={type}
          value={value ?? ''}
          onChange={(e)=>onChange(e.target.value)}
          placeholder={placeholder}
          InputLabelProps={type === 'date' ? { shrink: true } : undefined}
        />
      ) : (
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          {value || '—'}
        </Typography>
      )}
    </Box>
  );
}
function InfoPassword({ label, value, onChange, editMode }) {
  const [visible, setVisible] = useState(false);
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '.08em' }}>
        {label}
      </Typography>
      {editMode ? (
        <TextField
          fullWidth
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e)=>onChange(e.target.value)}
          placeholder="Lascia vuoto per non cambiare"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={()=>setVisible(v=>!v)}>
                  {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      ) : (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2">********</Typography>
          <Tooltip title="La password si modifica in modalità modifica">
            <VisibilityOffIcon fontSize="small" sx={{ opacity: .5 }} />
          </Tooltip>
        </Stack>
      )}
    </Box>
  );
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
  const [password, setPassword] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchMe();
        if (!mounted) return;
        const p = toProfileStateFromServer(data);
        setProfile({
          name: p.name, surname: p.surname, birthDate: p.birthDate, email: p.email,
          questionnaireDone: p.questionnaireDone, city: p.city, cap: p.cap,
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

  function updateField(field, value) { setProfile(p => ({ ...p, [field]: value })); }
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
    if (!profile) return;
    setError(''); setSaving(true);
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
      if (password.trim()) payload.password = password.trim();

      await updateMe(payload);

      let fresh = null;
      try { fresh = await fetchMe(); } catch {/**/}

      const basis = fresh || { ...payload, questionnaireDone: profile.questionnaireDone };
      const computedComplete = computeProfileCompleteLocal({
        name: basis.name, surname: basis.surname, email: basis.email,
        city: basis.city, cap: basis.cap, address: basis.address,
      });

      setUser(prev => ({ ...(prev || {}), ...(fresh || {}), profileComplete: computedComplete }));

      if (fresh) {
        const p = toProfileStateFromServer(fresh);
        setProfile({
          name: p.name, surname: p.surname, birthDate: p.birthDate, email: p.email,
          questionnaireDone: p.questionnaireDone, city: p.city, cap: p.cap,
          emergencyContacts: p.emergencyContacts,
        });
        setAddrStreet(p.__addrStreet);
        setAddrNumber(p.__addrNumber);
      }

      setPassword('');
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
    <Box className="container" sx={{ mt: 3, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Area personale</Typography>
        <Button
          startIcon={<EditIcon />}
          variant="center"
          onClick={() => setEditMode(true)}
          disabled={editMode}
        >
        
        </Button>
      </Stack>

      {!profileCompleteLocalFlag && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Completa il tuo profilo</strong> per poter prenotare appuntamenti e usare tutte le funzioni.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* DATI PERSONALI — layout a 12 colonne con righe simmetriche */}
      {/* DATI PERSONALI — layout 3 colonne fisse (4/4/4) */}
<Paper sx={{ p: 3 }}>
  <form onSubmit={onSave}>
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
      }}
    >
      {/* helper per posizionare in colonna 4/4/4 */}
      {/* col1 = 1..4, col2 = 5..8, col3 = 9..12 */}
      {/* riga indicata da gridRow per mantenere le colonne anche in edit */}
      {/* RIGA 1 */}
      <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / span 4' }, gridRow: { md: 1 } }}>
        <InfoField label="NOME" value={profile.name} onChange={(v)=>updateField('name', v)} editMode={editMode} />
      </Box>
      <Box sx={{ gridColumn: { xs: '1 / -1', md: '5 / span 4' }, gridRow: { md: 1 } }}>
        <InfoField label="COGNOME" value={profile.surname} onChange={(v)=>updateField('surname', v)} editMode={editMode} />
      </Box>
      <Box sx={{ gridColumn: { xs: '1 / -1', md: '9 / span 4' }, gridRow: { md: 1 } }}>
        <InfoField label="DATA DI NASCITA" value={profile.birthDate} onChange={(v)=>updateField('birthDate', v)} type="date" editMode={editMode} />
      </Box>

      {/* RIGA 2 */}
      <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / span 4' }, gridRow: { md: 2 } }}>
        <InfoField label="EMAIL" value={profile.email} onChange={(v)=>updateField('email', v)} editMode={editMode} />
      </Box>
      <Box sx={{ gridColumn: { xs: '1 / -1', md: '5 / span 4' }, gridRow: { md: 2 } }}>
        <InfoPassword label="PASSWORD" value={password} onChange={setPassword} editMode={editMode} />
      </Box>
      {/* spacer per tenere la colonna 3 vuota ma allineata */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, gridColumn: '9 / span 4', gridRow: 2 }} />

      {/* RIGA 3 */}
      <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / span 4' }, gridRow: { md: 3 } }}>
        <InfoField label="CITTÀ" value={profile.city} onChange={(v)=>updateField('city', v)} editMode={editMode} />
      </Box>
      <Box sx={{ gridColumn: { xs: '1 / -1', md: '5 / span 4' }, gridRow: { md: 3 } }}>
        <InfoField label="CAP" value={profile.cap} onChange={(v)=>updateField('cap', v)} editMode={editMode} />
      </Box>
      <Box sx={{ display: { xs: 'none', md: 'block' }, gridColumn: '9 / span 4', gridRow: 3 }} />

      {/* RIGA 4 */}
      <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / span 4' }, gridRow: { md: 4 } }}>
        <InfoField label="INDIRIZZO (VIA)" value={addrStreet} onChange={setAddrStreet} editMode={editMode} />
      </Box>
      <Box sx={{ gridColumn: { xs: '1 / -1', md: '5 / span 4' }, gridRow: { md: 4 } }}>
        <InfoField label="NUMERO CIVICO" value={addrNumber} onChange={setAddrNumber} editMode={editMode} />
      </Box>
      <Box sx={{ display: { xs: 'none', md: 'block' }, gridColumn: '9 / span 4', gridRow: 4 }} />

      {/* Questionario */}
      <Box sx={{ gridColumn: '1 / -1', mt: 1 }}>
        {qDone ? (
          <Alert severity="success" variant="standard" sx={{ borderRadius: 2 }}>
            Questionario completato
          </Alert>
        ) : (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
            Questionario non completato
          </Alert>
        )}
      </Box>
    </Box>

    {/* AZIONI — solo in editMode, in basso a destra */}
    {editMode && (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button type="submit" variant="contained" disabled={saving}>
          {saving ? 'Salvataggio…' : 'Salva modifiche'}
        </Button>
      </Box>
    )}
  </form>
</Paper>

      {/* Contatti di emergenza */}
<Paper sx={{ p: 3, mt: 4 }}>
  <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
    Contatti di emergenza
  </Typography>

  {(profile.emergencyContacts || []).map((c, idx) => (
    <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
        }}
      >
        {/* RIGA 1 */}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / span 4' }, gridRow: { md: 1 } }}>
          <InfoField
            label="NOME E COGNOME"
            value={c.name}
            onChange={(v) => updateEC(idx, 'name', v)}
            editMode={editMode}
          />
        </Box>
        <Box sx={{ gridColumn: { xs: '1 / -1', md: '5 / span 4' }, gridRow: { md: 1 } }}>
          <InfoField
            label="RELAZIONE"
            value={c.relation}
            onChange={(v) => updateEC(idx, 'relation', v)}
            editMode={editMode}
          />
        </Box>
        <Box sx={{ gridColumn: { xs: '1 / -1', md: '9 / span 4' }, gridRow: { md: 1 } }}>
          <InfoField
            label="TELEFONO"
            value={c.phone}
            onChange={(v) => updateEC(idx, 'phone', v)}
            editMode={editMode}
          />
        </Box>

        {/* RIGA 2: EMAIL (tutta riga) */}
        <Box sx={{ gridColumn: '1 / -1', gridRow: { md: 2 } }}>
          <InfoField
            label="EMAIL (FACOLTATIVA)"
            value={c.email}
            onChange={(v) => updateEC(idx, 'email', v)}
            editMode={editMode}
          />
        </Box>

        

        {/* RIGA 4: Azioni (solo in modifica) */}
        {editMode && (
          <Box
            sx={{
              gridColumn: '1 / -1',
              gridRow: { md: 4 },
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <IconButton aria-label="Rimuovi contatto" onClick={() => removeEC(idx)}>
              <DeleteOutlineIcon />
            </IconButton>
          </Box>
        )}
      </Box>
    </Paper>
  ))}

  <Button
    startIcon={<AddIcon />}
    onClick={addEC}
    disabled={!editMode || (profile.emergencyContacts || []).length >= 2}
  >
    Aggiungi contatto 
  </Button>
</Paper>


      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={()=>setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} sx={{ width: '100%' }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
