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
    return (parts[0]?.[0] || '').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
  }
  return (user?.email?.[0] || 'U').toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isTherapist = user?.role === 'therapist';
  const homePath = user ? (isTherapist ? '/therapist/dashboard' : '/dashboard') : '/';
  const profileHref = user
    ? (isTherapist ? '/therapist/profile' : '/profile')
    : '/login';

  // Menù utente (hover + click)
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const openMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

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

        {/* Navigazione paziente */}
        {user && !isTherapist && (
          <>
            <Button color="inherit" component={RouterLink} to="/dashboard">Dashboard</Button>
            <Button color="inherit" component={RouterLink} to="/diary">Diario</Button>
            <Button color="inherit" component={RouterLink} to="/appointments">Appuntamenti</Button>
          </>
        )}

        {/* Navigazione terapeuta */}
        {user && isTherapist && (
          <>
            <Button color="inherit" component={RouterLink} to="/therapist/dashboard">Dashboard</Button>
            {/* Agenda/slot */}
            <Button color="inherit" component={RouterLink} to="/therapist/schedule">Agenda</Button>
          </>
        )}

        <Box sx={{ flex: 1 }} />

        {user && (
          <>
            {/* Campanella notifiche */}
            <NotificationsBell />

            {/* Avatar + menù utente */}
            <Box
              onMouseEnter={openMenu}
              onClick={openMenu}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <Tooltip title="Area utente">
                <Avatar sx={{ width: 32, height: 32 }}>
                  {initialsFrom(user)}
                </Avatar>
              </Tooltip>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={closeMenu}
              MenuListProps={{ onMouseLeave: closeMenu }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => { closeMenu(); navigate(profileHref); }}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                Area personale
              </MenuItem>

              <Divider />

              <MenuItem onClick={() => { closeMenu(); logout(); }}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}








