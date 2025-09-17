// frontend/src/pages/Home.jsx
import { Box, Stack, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { LoginPanel } from './Login';

export default function Home() {
  
  const HEADLINE = 'Le radici di sè.';
  const SUBHEAD  = 'Il tuo spazio riservato per capire, scegliere, ripartire.';

  
  const points = [
    'Appuntamenti online o in studio',
    'Area personale riservata',
    'Materiali e letture assegnate',
  ];

  return (
    <Box
      sx={{
        
        px: { xs: 2, sm: 4 },
        pt: { xs: 3, sm: 6 },
        pb: { xs: 5, sm: 8 },
      }}
    >
      <Box
        sx={{
          
          maxWidth: 1240,
          mx: 'auto',
          display: 'grid',
          gap: { xs: 3, md: 15 },
          gridTemplateColumns: { xs: '1fr', md: 'minmax(520px, 1fr) 420px' },
          alignItems: 'start',
        }}
      >
        
        <Box
          sx={{
            pr: { md: 4 },
            mt: { xs: 1, md: 23 },     
            ml: { md: -14 },           
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

        
        <Stack sx={{ position: 'relative', top: {md: 58 } }}>
          <LoginPanel />
        </Stack>
      </Box>
    </Box>
  );
}
