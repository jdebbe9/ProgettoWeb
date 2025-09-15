// frontend/src/pages/Dashboard.jsx
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Grid, Paper, Stack, Typography, Divider
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EditNoteIcon from '@mui/icons-material/EditNote';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Diversity2Icon from '@mui/icons-material/Diversity2';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SchoolIcon from '@mui/icons-material/School';
import SecurityIcon from '@mui/icons-material/Security';

// === dimensioni uniformi (qui puoi ritoccare i valori) ===
const FEATURE_MIN_H = 96;   // riquadri "Cosa puoi fare qui"
const SERVICE_MIN_H = 120;  // riquadri "Servizi"

// Contenuti
const FEATURES = [
  { icon: EventAvailableIcon, title: 'Richiedere e gestire gli appuntamenti', to: '/appointments' },
  { icon: EditNoteIcon,       title: 'Scrivere il diario personale (anche privato)', to: '/diary' },
  { icon: MenuBookIcon,       title: 'Consultare i materiali assegnati', to: '/materials' },
  { icon: CheckCircleIcon,    title: 'Tenere traccia di obiettivi e compiti tra sedute', to: '/goals' },
];

const SERVICES = [
  { icon: SearchIcon,        title: 'Colloquio conoscitivo',    subtitle: 'Primo incontro per definire obiettivi e percorso.' },
  { icon: PersonOutlineIcon, title: 'Psicoterapia individuale', subtitle: 'Sedute settimanali personalizzate.' },
  { icon: Diversity2Icon,    title: 'Terapia di coppia',        subtitle: 'Per comunicazione e gestione dei conflitti.' },
  { icon: LaptopMacIcon,     title: 'Consulenza online',        subtitle: 'Video-sedute sicure e flessibili.' },
  { icon: PsychologyIcon,    title: 'Psicoeducazione',          subtitle: 'Strumenti pratici per ansia e stress.' },
  { icon: SchoolIcon,        title: 'Supervisione clinica',     subtitle: 'Per professionisti in formazione.' },
];

function FeatureItem({ icon: Icon, title, to }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2, borderRadius: 3,
        minHeight: FEATURE_MIN_H,      // ⬅️ altezza identica
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pr: 1 }}>
        {Icon && <Icon fontSize="small" />}
        <Typography fontWeight={700}>{title}</Typography>
      </Stack>
      <Button size="small" component={RouterLink} to={to} variant="contained">APRI</Button>
    </Paper>
  );
}

function ServiceCard({ icon: Icon, title, subtitle }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2, borderRadius: 3,
        minHeight: SERVICE_MIN_H,      // ⬅️ altezza identica
        width: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 1
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        {Icon && <Icon fontSize="small" />}
        <Typography fontWeight={700}>{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
    </Paper>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <Box className="container" sx={{ mt: 3, mb: 6, maxWidth: 1100 }}>
      {/* HERO */}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mb: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            Ciao {user?.name ? `${user.name}` : 'e benvenuto/a'} 
          </Typography>
          <Typography color="text.secondary">
            Questo è il tuo spazio riservato: semplice, discreto e professionale dove troverai il necessario per seguire il percorso con continuità.
          </Typography>
        </Stack>
      </Paper>

      {/* COSA PUOI FARE QUI — 2×2 simmetrico */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>Cosa puoi fare qui</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }} alignItems="stretch">
        {FEATURES.map((f, i) => (
          <Grid key={i} item xs={12} md={6} sx={{ display: 'flex' }}>
            <FeatureItem {...f} />
          </Grid>
        ))}
      </Grid>

      {/* SERVIZI — 3×2 simmetrico */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>Servizi</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }} alignItems="stretch">
        {SERVICES.map((s, i) => (
          <Grid key={i} item xs={12} md={4} sx={{ display: 'flex' }}>
            <ServiceCard {...s} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}




