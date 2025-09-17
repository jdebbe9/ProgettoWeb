// src/pages/therapist/TherapistProfile.jsx
import { useMemo } from 'react';
import {
  Box, Paper, Stack, Avatar, Typography, Alert
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PlaceIcon from '@mui/icons-material/Place';
import PhoneIcon from '@mui/icons-material/Phone';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAuth } from '../../context/AuthContext';

function formatD(d) {
  try { return new Date(d).toLocaleDateString('it-IT'); } catch { return '—'; }
}

// === Studio (solo lettura) dal localStorage ===
const LS_KEY = (uid) => `therapist:studio:${uid || 'unknown'}`;
function loadStudio(uid) {
  try {
    const raw = localStorage.getItem(LS_KEY(uid));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function TherapistProfile() {
  const { user } = useAuth();
  const isTherapist = user?.role === 'therapist';
  const therapistId = user?._id || user?.id || '';
  const initials = `${user?.name?.[0] || 'T'}${user?.surname?.[0] || ''}`;

  const studio = useMemo(() => loadStudio(therapistId), [therapistId]);
  const hours  = studio?.hours || '';

  if (!isTherapist) {
    return (
      <Box className="container" sx={{ mt: 3 }}>
        <Alert severity="warning">Questa pagina è riservata al terapeuta.</Alert>
      </Box>
    );
  }

  const bio = `Offro supporto psicologico orientato al benessere della persona, con un approccio pratico e chiaro.
Lavoro su obiettivi concordati insieme e su percorsi personalizzati.`;

  return (
    <Box className="container" sx={{ mt: 2, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Area Personale</Typography>

      {/* Layout 3:1 fisso con CSS Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '3fr 1fr' },
          gap: 2,                 // = theme.spacing(2) = 16px
          alignItems: 'stretch',  // altezze uguali
        }}
      >
        {/* SX (3 parti) */}
        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 64, height: 64 }}>{initials}</Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h6" noWrap>
                {user?.name} {user?.surname}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
            </Box>
          </Stack>

          <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
            {bio}
          </Typography>

          {/* Dati in griglia: Nome/Cognome, poi Data di nascita, poi Email */}
          <Box
            sx={{
              mt: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              columnGap: 2,
              rowGap: 2,
            }}
          >
            <Info label="NOME" value={user?.name || '—'} />
            <Info label="COGNOME" value={user?.surname || '—'} />

            <Box sx={{ gridColumn: '1 / -1' }}>
              <Info label="DATA DI NASCITA" value={user?.birthDate ? formatD(user.birthDate) : '—'} />
            </Box>

            <Box sx={{ gridColumn: '1 / -1' }}>
              <Info label="EMAIL" value={user?.email || '—'} />
            </Box>
          </Box>
        </Paper>

        {/* DX (1 parte) */}
        <Paper variant="outlined" sx={{ p: 1.7, height: '100%' }}>
          

          {/* Studio */}
          <Section title="Studio">
            <Row icon={<BusinessIcon />} label="Nome"     value={studio?.businessName || 'Le radici di sè'} />
            <Row icon={<PlaceIcon />}    label="Indirizzo" value={studio?.address || 'Via Esempio 123, Bari'} />
            <Row icon={<PhoneIcon />}    label="Telefono"  value={studio?.phone || '+39 000 000 0000'} />
          </Section>

          {/* Visite */}
          <Section title="Visite">
            <Typography variant="body2" color="text.secondary">In studio/Online</Typography>
          </Section>

          {/* Orari di servizio */}
          <Section title="Orari di servizio">
            <Stack spacing={0.5}>
              {hours
                ? <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{hours}</Typography>
                : (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AccessTimeIcon fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Lun–Ven 9:00–19:00</Typography>
                  </Stack>
                )
              }
            </Stack>
          </Section>
        </Paper>
      </Box>
    </Box>
  );
}

/* === piccoli componenti di presentazione === */
function Info({ label, value }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '.08em' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value}</Typography>
    </Box>
  );
}

function Section({ title, children }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="overline" color="text.secondary">{title.toUpperCase()}</Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Box>
  );
}

function Row({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 0.5 }}>
      <Box sx={{ mt: '2px' }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value}</Typography>
      </Box>
    </Stack>
  );
}
