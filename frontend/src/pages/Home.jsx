// frontend/src/pages/Home.jsx
import { Box, Stack, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { LoginPanel } from './Login';

export default function Home() {
  // ⇣ scegli qui la tua frase (pronta la #8)
  const HEADLINE = 'PsicoCare Studio.';
  const SUBHEAD  = 'Il tuo spazio riservato per capire, scegliere, ripartire.';

  // punti brevi (opzionali)
  const points = [
    'Appuntamenti online o in studio',
    'Area personale riservata',
    'Materiali e letture assegnate',
  ];

  return (
    <Box
      sx={{
        // più spazio in alto e ai lati
        px: { xs: 2, sm: 4 },
        pt: { xs: 3, sm: 6 },
        pb: { xs: 5, sm: 8 },
      }}
    >
      <Box
        sx={{
          // contenitore più largo, ma spostiamo il blocco testo un filo a sinistra
          maxWidth: 1240,
          mx: 'auto',
          display: 'grid',
          gap: { xs: 3, md: 15 },
          gridTemplateColumns: { xs: '1fr', md: 'minmax(520px, 1fr) 420px' },
          alignItems: 'start',
        }}
      >
        {/* Colonna sinistra (hero): leggermente più in basso e un filo più a sinistra */}
        <Box
          sx={{
            pr: { md: 4 },
            mt: { xs: 1, md: 23 },     // ⇠ più in basso
            ml: { md: -14 },           // ⇠ sposta un po’ a sinistra
            position: 'relative',
          }}
        >
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.1,
              mb: 2,
              letterSpacing: '-0.5px',
            }}
          >
            {HEADLINE}
          </Typography>

          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            {SUBHEAD}
          </Typography>

          <Paper variant="outlined" sx={{ p: 2, maxWidth: 560 }}>
            <List dense disablePadding>
              {points.map((p, i) => (
                <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleOutlineIcon />
                  </ListItemIcon>
                  <ListItemText primary={p} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>

        {/* Colonna destra: pannello di login (sticky) */}
        <Stack sx={{ position: 'relative', top: {md: 58 } }}>
          <LoginPanel />
        </Stack>
      </Box>
    </Box>
  );
}
