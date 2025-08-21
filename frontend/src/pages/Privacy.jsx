// src/pages/Privacy.jsx
import { Box, Paper } from '@mui/material'
import PrivacyContent from '../components/PrivacyContent'

export default function Privacy() {
  return (
    <Box className="container" sx={{ mt: 3 }}>
      <Paper sx={{ p: 3 }}>
        <PrivacyContent />
      </Paper>
    </Box>
  )
}

