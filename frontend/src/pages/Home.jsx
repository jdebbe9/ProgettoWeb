// frontend/src/pages/Home.jsx
import { Box, Button, Paper, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <Box className="container" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }} elevation={3}>
        <Typography variant="h3" component="h1" gutterBottom>
          Benvenuto nello Studio PsicoCare
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 3 }}>
          Un luogo sicuro per il tuo benessere mentale.
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
          Qui puoi trovare informazioni, prenotare i tuoi appuntamenti e tenere un diario personale dei tuoi pensieri,
          in un ambiente protetto e riservato.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button variant="contained" size="large" component={Link} to="/register">
            Registrati Ora
          </Button>
          <Button variant="outlined" size="large" component={Link} to="/login">
            Accedi
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}