// src/pages/Diary.jsx
import { Box, Paper, Typography } from '@mui/material';

export default function Diary() {
  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 720 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Diario</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">
          Qui apparirà il tuo diario (lista voci + crea/modifica/elimina).
          Per ora è un placeholder così non avrai più la 404.
        </Typography>
      </Paper>
    </Box>
  );
}

