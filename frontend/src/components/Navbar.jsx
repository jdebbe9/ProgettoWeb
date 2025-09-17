// src/components/Navbar.jsx
import { useState } from 'react';
import {
  AppBar, Box, Toolbar,
  Menu, MenuItem, ListItemIcon, Tooltip, Divider, IconButton, Typography
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useAuth } from '../context/AuthContext';
import NotificationsBell from './NotificationsBell';
import Sidebar from './Sidebar';

// ⬇️ tua icona BIANCA (trasparente) per la topbar
import logoWhite from '../assets/psicocare-logo-white.png';

// ⬇️ se per ora NON hai la versione bianca, usa TEMPORANEAMENTE la stessa favicon blu
// import logoWhite from '/favicon.png'; // e lascia attivo il filtro CSS più sotto

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const isTherapist = user?.role === 'therapist';

  const goLogout = async () => {
    try { if (logout) await logout(); }
    catch (e) { if (import.meta?.env?.DEV) console.warn('Logout failed:', e); }
    finally { handleClose(); navigate('/login'); }
  };

  return (
    <>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          {/* Brand: tua icona + wordmark */}
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              mr: 2
            }}
          >
            <Box
              component="img"
              src={logoWhite}
              alt="Le radici di sè"
              sx={{
                width: 40,
                height: 40,
                mr: 1,
                display: 'block',
                // ⬇️ se stai usando PROVVISORIAMENTE la PNG blu, sbiancala con il filtro:
                // filter: 'brightness(0) invert(1) saturate(0)',
              }}
            />
            <Typography
              variant="h6"
              sx={{ fontWeight: 500, letterSpacing: '.2px', lineHeight: 1 }}
            >
              Le radici di sè
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {user && <NotificationsBell />}

          {user && (
            <>
              <Tooltip title="Account">
                <IconButton
                  color="inherit"
                  onClick={handleOpen}
                  size="large"
                  aria-label="Account"
                  sx={{ ml: 1 }}
                >
                  <AccountCircleIcon sx={{ fontSize: 28 }} />
                </IconButton>
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
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar a sinistra per utenti autenticati */}
      {user && <Sidebar />}
    </>
  );
}
