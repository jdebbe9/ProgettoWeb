import { Box, Button, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <Box className="container" sx={{ mt: 6, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ mb: 2 }}>404</Typography>
      <Typography sx={{ mb: 2 }}>Pagina non trovata</Typography>
      <Button variant="contained" component={Link} to="/">Vai alla Home</Button>
    </Box>
  )
}
