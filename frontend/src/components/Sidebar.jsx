// src/components/Sidebar.jsx
import { useMemo, useState, useEffect } from 'react';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Divider, Typography, Tooltip, IconButton, Paper
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Icone
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import PushPinIcon from '@mui/icons-material/PushPin';

// Dimensioni
const APPBAR_HEIGHT = { xs: 56, sm: 64 };
const SIDEBAR_WIDTH = { xs: 288, sm: 312 };
const RAIL_WIDTH = { xs: 56, sm: 64 };

// Helpers per localStorage
const safeLS = {
  getFlag(key, fallback = false) {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem(key) === '1') || fallback;
    } catch (e) {
      if (import.meta?.env?.DEV) console.warn('localStorage get failed:', e);
      return fallback;
    }
  },
  setFlag(key, value) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value ? '1' : '0');
    } catch (e) {
      if (import.meta?.env?.DEV) console.warn('localStorage set failed:', e);
    }
  }
};

function useNavItems(role) {
  return useMemo(() => {
    if (role === 'therapist') {
      return [
        { to: '/therapist/dashboard', label: 'Home', icon: <HomeOutlinedIcon /> },
        { to: '/therapist/schedule',  label: 'Agenda', icon: <CalendarMonthIcon /> },
        { to: '/therapist/patients',  label: 'Pazienti', icon: <PeopleAltOutlinedIcon /> },
        { to: '/therapist/articles',  label: 'Articoli', icon: <ArticleOutlinedIcon /> },
        { to: '/therapist/books',     label: 'Libri', icon: <LibraryBooksOutlinedIcon /> },
        { to: '/therapist/profile',   label: 'Profilo', icon: <PersonOutlineOutlinedIcon /> },
      ];
    }
    return [
      { to: '/dashboard',    label: 'Home',         icon: <HomeOutlinedIcon /> },
      { to: '/appointments', label: 'Appuntamenti', icon: <CalendarMonthIcon /> },
      { to: '/diary',        label: 'Diario',       icon: <EditNoteOutlinedIcon /> },
      { to: '/materials',    label: 'Materiali',    icon: <MenuBookOutlinedIcon /> },
      { to: '/goals',        label: 'Obiettivi',    icon: <FlagOutlinedIcon /> },
      { to: '/profile',      label: 'Profilo',      icon: <PersonOutlineOutlinedIcon /> },
    ];
  }, [role]);
}

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;
  const items = useNavItems(role);
  const [hoverOpen, setHoverOpen] = useState(false);

  // 🔒 pin persistito
  const [pinned, setPinned] = useState(() => safeLS.getFlag('sidebarPinned', false));
  useEffect(() => { safeLS.setFlag('sidebarPinned', pinned); }, [pinned]);

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (to) => pathname === to || pathname.startsWith(to + '/');
  const actuallyOpen = hoverOpen || pinned;

  const handleNavigate = (to) => {
    navigate(to);
    if (!pinned) setHoverOpen(false);
  };

  const togglePin = () => setPinned(v => !v);

  return (
    <>
      {/* Mini-rail SEMPRE visibile */}
      <Paper
        elevation={0}
        onMouseEnter={() => setHoverOpen(true)}
        sx={{
          position: 'fixed',
          left: 0,
          top: { xs: APPBAR_HEIGHT.xs, sm: APPBAR_HEIGHT.sm },
          width: { xs: RAIL_WIDTH.xs, sm: RAIL_WIDTH.sm },
          height: {
            xs: `calc(100vh - ${APPBAR_HEIGHT.xs}px)`,
            sm: `calc(100vh - ${APPBAR_HEIGHT.sm}px)`,
          },
          borderRight: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: (theme) => theme.palette.background.paper,
          zIndex: (theme) => theme.zIndex.drawer,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          py: 1,
        }}
      >
        <Typography variant="overline" sx={{ fontSize: 10, opacity: 0.7, mt: 0.5 }}>
          Menu
        </Typography>

        <Divider sx={{ width: '60%', my: 0.5 }} />

        {/* Icone verticali */}
        {items.map((it) => {
          const active = isActive(it.to);
          return (
            <Tooltip key={it.to} title={it.label} placement="right">
              <IconButton
                size="large"
                onClick={() => handleNavigate(it.to)}
                onMouseEnter={() => setHoverOpen(true)}
                aria-current={active ? 'page' : undefined}
                sx={{
                  my: 0.25,
                  color: (theme) =>
                    active ? theme.palette.primary.main : theme.palette.text.secondary,
                  '&:hover': (theme) => ({
                    color: theme.palette.primary.main,
                    backgroundColor: theme.palette.action.hover,
                  }),
                }}
              >
                {it.icon}
              </IconButton>
            </Tooltip>
          );
        })}

        <Box sx={{ flexGrow: 1 }} />

        {/* Toggle PIN anche dalla rail */}
        <Tooltip title={pinned ? 'Sblocca menu' : 'Blocca menu aperto'} placement="right">
          <IconButton
            onClick={togglePin}
            sx={{ mb: 1 }}
            color={pinned ? 'primary' : 'default'}
            aria-pressed={pinned ? 'true' : 'false'}
            aria-label={pinned ? 'Sblocca menu' : 'Blocca menu aperto'}
          >
            {pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Drawer esteso: resta aperto se pinned */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={actuallyOpen}
        onClose={() => { if (!pinned) setHoverOpen(false); }}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: (theme) => ({
            width: { xs: SIDEBAR_WIDTH.xs, sm: SIDEBAR_WIDTH.sm },
            top: { xs: APPBAR_HEIGHT.xs, sm: APPBAR_HEIGHT.sm },
            height: {
              xs: `calc(100% - ${APPBAR_HEIGHT.xs}px)`,
              sm: `calc(100% - ${APPBAR_HEIGHT.sm}px)`,
            },
            borderRight: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
          })
        }}
        onMouseLeave={() => { if (!pinned) setHoverOpen(false); }}
      >
        <Box sx={{ py: 1 }}>
          <Box sx={{ px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Navigazione
            </Typography>
            <Tooltip title={pinned ? 'Sblocca menu' : 'Blocca menu aperto'}>
              <IconButton
                onClick={togglePin}
                size="small"
                color={pinned ? 'primary' : 'default'}
                aria-pressed={pinned ? 'true' : 'false'}
              >
                {pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>

          <Divider sx={{ my: 1 }} />

          <List dense disablePadding>
            {items.map((item) => {
              const active = isActive(item.to);
              return (
                <ListItemButton
                  key={item.to}
                  selected={active}
                  onClick={() => handleNavigate(item.to)}
                  aria-current={active ? 'page' : undefined}
                  sx={(theme) => ({
                    py: 1.1,
                    borderLeft: active ? `3px solid ${theme.palette.primary.main}` : '3px solid transparent',
                    '& .MuiListItemIcon-root': {
                      color: active ? theme.palette.primary.main : theme.palette.text.secondary,
                    },
                    '& .MuiListItemText-primary': {
                      fontWeight: active ? 600 : 500,
                    },
                    '&.Mui-selected': {
                      color: theme.palette.primary.main,
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      },
                    },
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  })}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
