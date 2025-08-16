// src/pages/Privacy.jsx
import { Box, Paper, Typography } from '@mui/material'

export default function Privacy() {
  return (
    <Box className="container" sx={{ mt: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Informativa Privacy (demo)</Typography>
        <Typography variant="body2">
          Questa è una pagina dimostrativa per l’informativa sul trattamento dei dati personali
          ai fini del progetto universitario. Nessun dato viene condiviso con terze parti al di fuori
          dell’ambiente di test. 
        </Typography>
      </Paper>
    </Box>
  )
}
