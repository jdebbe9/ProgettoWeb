// src/components/Navbar.jsx
import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const isTherapist = user?.role === 'therapist'
  const homePath = user ? (isTherapist ? '/therapist/dashboard' : '/dashboard') : '/login'

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 2 }}>
        <Typography
          variant="h6"
          component={RouterLink}
          to={homePath}
          sx={{ color: 'inherit', textDecoration: 'none', mr: 2 }}
        >
          PsicoCare
        </Typography>

        {user && !isTherapist && (
          <>
            <Button color="inherit" component={RouterLink} to="/dashboard">Dashboard</Button>
            <Button color="inherit" component={RouterLink} to="/diary">Diary</Button>
            <Button color="inherit" component={RouterLink} to="/appointments">Appuntamenti</Button>
            <Button color="inherit" component={RouterLink} to="/questionnaire">Questionario</Button>
          </>
        )}

        {user && isTherapist && (
          <Button color="inherit" component={RouterLink} to="/therapist/dashboard">TERAPEUTA</Button>
        )}

        <Box sx={{ flex: 1 }} />
        {user ? (
          <>
            <Typography variant="body2" sx={{ opacity: 0.8, mr: 1 }}>
              {user.email} · {user.role}
            </Typography>
            <Button color="inherit" onClick={logout}>LOGOUT</Button>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" component={RouterLink} to="/login">Accedi</Button>
            <Button color="inherit" component={RouterLink} to="/register">Registrati</Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  )
}

