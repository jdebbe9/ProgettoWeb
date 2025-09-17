// frontend/src/pages/Dashboard.jsx
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Paper, Stack, Typography
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EditNoteIcon from '@mui/icons-material/EditNote';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Diversity2Icon from '@mui/icons-material/Diversity2';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SchoolIcon from '@mui/icons-material/School';


const FEATURE_H = 110;  
const SERVICE_H = 110;  


const FEATURES = [
  { icon: EventAvailableIcon, title: 'Richiedere e gestire gli appuntamenti', to: '/appointments' },
  { icon: EditNoteIcon,       title: 'Scrivere i tuoi pensieri nel diario personale', to: '/diary' },
  { icon: MenuBookIcon,       title: 'Consultare i materiali assegnati', to: '/materials' },
  { icon: CheckCircleIcon,    title: 'Tenere traccia dei tuoi obiettivi', to: '/goals' },
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
        p: 2, borderRadius: 2,
        height: FEATURE_H,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pr: 1, minWidth: 0 }}>
        {Icon && <Icon fontSize="small" />}
        <Typography fontWeight={700} noWrap title={title}>{title}</Typography>
      </Stack>
      <Button size="small" component={RouterLink} to={to} sx={{ alignSelf: 'center' } }>APRI</Button>
    </Paper>
  );
}

function ServiceCard({ icon: Icon, title, subtitle }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2, borderRadius: 2,
        height: SERVICE_H,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 1, minWidth: 0
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        {Icon && <Icon fontSize="small" />}
        <Typography fontWeight={700} noWrap title={title}>{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" noWrap title={subtitle}>
        {subtitle}
      </Typography>
    </Paper>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <Box className="container" sx={{ mt: 3, mb: 6, maxWidth: 1100 }}>
      
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, mb: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            Ciao {user?.name ? `${user.name}` : 'e benvenuto/a'}
          </Typography>
          <Typography color="text.secondary">
            Questo è il tuo spazio riservato: semplice, discreto e professionale dove troverai il necessario per seguire il percorso con continuità.
          </Typography>
        </Stack>
      </Paper>

      
      <Typography variant="h6" sx={{ mb: 1.5 }}>Cosa puoi fare qui</Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)' }, 
          gap: 1,
          mb: 4,
          alignItems: 'stretch'
        }}
      >
        {FEATURES.map((f, i) => (
          <FeatureItem key={i} {...f} />
        ))}
      </Box>

     
      <Typography variant="h6" sx={{ mb: 1.5 }}>Servizi</Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 1,
          mb: 4,
          alignItems: 'stretch'
        }}
      >
        {SERVICES.map((s, i) => (
          <ServiceCard key={i} {...s} />
        ))}
      </Box>
    </Box>
  );
}
