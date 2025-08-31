// src/components/Navbar.jsx
import { useState } from 'react';
import {
  AppBar, Box, Button, Toolbar, Typography,
  Avatar, Menu, MenuItem, ListItemIcon, Tooltip, Divider
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import NotificationsBell from './NotificationsBell';

function initialsFrom(user) {
  const n = [user?.name, user?.surname].filter(Boolean).join(' ').trim();
  if (n) {
    const parts = n.split(/\s+/);
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
  }
  const email = user?.email || '';
  return email ? email[0].toUpperCase() : 'U';
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const isTherapist = user?.role === 'therapist';
  const isPatient   = user?.role === 'patient';

  const goLogout = async () => {
    try {
      if (logout) await logout();
    } catch (e) {
      if (import.meta?.env?.DEV) console.warn('Logout failed:', e);
    } finally {
      handleClose();
      navigate('/login');
    }
  };

  return (
    <AppBar position="static" color="primary" elevation={0}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          color="inherit"
          sx={{ textDecoration: 'none', mr: 2 }}
        >
          PsicoCare
        </Typography>

        {/* Link TERAPEUTA */}
        {user && isTherapist && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button component={RouterLink} to="/therapist/dashboard" color="inherit">Home</Button>
            <Button component={RouterLink} to="/therapist/schedule" color="inherit">Agenda</Button>
            <Button component={RouterLink} to="/therapist/patients" color="inherit">Pazienti</Button>
            <Button component={RouterLink} to="/therapist/articles" color="inherit">Articoli</Button>
            <Button component={RouterLink} to="/therapist/books" color="inherit">Libri</Button>
          </Box>
        )}

        {/* Link PAZIENTE */}
        {user && isPatient && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button component={RouterLink} to="/dashboard" color="inherit">Home</Button>
            <Button component={RouterLink} to="/appointments" color="inherit">Appuntamenti</Button>
            <Button component={RouterLink} to="/diary" color="inherit">Diario</Button>
            <Button component={RouterLink} to="/materials" color="inherit">Materiali</Button>
            <Button component={RouterLink} to="/goals" color="inherit">Obiettivi</Button>
            <Button component={RouterLink} to="/safety-plan" color="inherit">Sicurezza</Button>
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {user && <NotificationsBell />}

        {user ? (
          <>
            <Tooltip title="Account">
              <Avatar
                sx={{ ml: 1, cursor: 'pointer' }}
                onClick={handleOpen}
              >
                {initialsFrom(user)}
              </Avatar>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                component={RouterLink}
                to={isTherapist ? '/therapist/profile' : '/profile'}
                onClick={handleClose}
              >
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                Area personale
              </MenuItem>
              <Divider />
              <MenuItem onClick={goLogout}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button component={RouterLink} to="/login" color="inherit">Login</Button>
            <Button component={RouterLink} to="/register" color="inherit">Registrati</Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}










