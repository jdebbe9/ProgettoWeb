import { Box, Paper, Typography } from '@mui/material'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <Box className="container" sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Ciao {user?.name || 'utente'} 👋</Typography>
      <Paper sx={{ p: 2 }} elevation={2}>
        <Typography>Benvenuto nella tua dashboard. Da qui puoi gestire diario, appuntamenti e questionario.</Typography>
      </Paper>
    </Box>
  )
}
