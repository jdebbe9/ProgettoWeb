import { useEffect, useRef, useState } from 'react';
import {
  Badge, Box, CircularProgress, Divider, IconButton, List, ListItemButton,
  ListItemText, Menu, Typography, Button
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getUnreadCount, listNotifications, markAllRead, markRead, deleteAll
} from '../api/notifications';

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

function routeFor(notifType, role) {
  const t = String(notifType || '').toUpperCase();
  const isTher = role === 'therapist';
  if (t.startsWith('APPT_')) return isTher ? '/therapist/dashboard' : '/appointments';
  if (t === 'QUESTIONNAIRE_COMPLETED') return isTher ? '/therapist/dashboard' : '/dashboard';
  return isTher ? '/therapist/dashboard' : '/dashboard';
}

const isRead = (n) => Boolean(n?.readAt || n?.read || n?.isRead);

export default function NotificationsBell() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const menuOpenRef = useRef(false);

  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  // ---- bootstrap: quando l'utente cambia, prendo il conteggio dal server
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setUnread(0);
      setItems([]);
      return;
    }
    getUnreadCount()
      .then((c) => setUnread(Number(c) || 0))
      .catch(() => {});
  }, [user, authLoading]);

  // ---- realtime via window events (bridgiati dal socket client)
  useEffect(() => {
    if (!user) return;

    const onUnread = (e) => {
      const next = Number(e?.detail?.count);
      if (Number.isFinite(next)) {
        setUnread(next); // prendo il numero "vero" dal server
      }
    };

    const onNew = (e) => {
      const notif = e?.detail;
      // Ottimistico: vedo subito il +1
      setUnread((u) => (Number.isFinite(u) ? u + 1 : 1));
      if (menuOpenRef.current && notif) {
        setItems((prev) => [notif, ...prev].slice(0, 20));
      }
      // Riallineo con il server (sicuro contro raddoppi/ritardi)
      getUnreadCount()
        .then((c) => setUnread(Number(c) || 0))
        .catch(() => {});
    };

    const onAppt = () => {
      // alcuni flussi emettono solo gli eventi appuntamento → rifaccio il count
      getUnreadCount()
        .then((c) => setUnread(Number(c) || 0))
        .catch(() => {});
    };

    window.addEventListener('rt:notifications:unread', onUnread);
    window.addEventListener('rt:notification', onNew);
    window.addEventListener('rt:appointment', onAppt);

    return () => {
      window.removeEventListener('rt:notifications:unread', onUnread);
      window.removeEventListener('rt:notification', onNew);
      window.removeEventListener('rt:appointment', onAppt);
    };
  }, [user]);

  // ---- apertura menu → carico lista e riallineo il badge
  function openMenu(e) {
    setAnchorEl(e.currentTarget);
    menuOpenRef.current = true;
    setLoading(true);

    listNotifications({ limit: 20 })
      .then((resp) => {
        const list = Array.isArray(resp) ? resp : resp?.items;
        setItems(Array.isArray(list) ? list : []);
        return getUnreadCount();
      })
      .then((c) => setUnread(Number(c) || 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function closeMenu() {
    setAnchorEl(null);
    menuOpenRef.current = false;
  }

  // ---- interazioni
  function onItemClick(n) {
    const go = () => {
      const target = routeFor(n.type, user?.role);
      closeMenu();
      navigate(target);
    };

    if (!isRead(n)) {
      markRead(n._id)
        .catch(() => {})
        .finally(() => {
          setItems((prev) =>
            prev.map((x) =>
              x._id === n._id ? { ...x, readAt: x.readAt || new Date().toISOString(), read: true, isRead: true } : x
            )
          );
          // prendo il numero reale dal server (così vado sicuro)
          getUnreadCount().then((c) => setUnread(Number(c) || 0)).catch(() => {});
          go();
        });
    } else {
      go();
    }
  }

  function onMarkAll() {
    setActionBusy(true);
    markAllRead()
      .then(() =>
        Promise.all([
          getUnreadCount().catch(() => 0),
          listNotifications({ limit: 20 }).catch(() => null),
        ])
      )
      .then(([c, resp]) => {
        setUnread(Number(c) || 0);
        const list = Array.isArray(resp) ? resp : resp?.items;
        if (Array.isArray(list)) setItems(list);
      })
      .catch(() => {})
      .finally(() => setActionBusy(false));
  }

  function onClearAll() {
    setActionBusy(true);
    const prevItems = items;

    setItems([]);
    setUnread(0);

    deleteAll()
      .then(() =>
        Promise.all([
          getUnreadCount().catch(() => 0),
          listNotifications({ limit: 20 }).catch(() => null),
        ])
      )
      .then(([c, resp]) => {
        setUnread(Number(c) || 0);
        const list = Array.isArray(resp) ? resp : resp?.items;
        if (Array.isArray(list)) setItems(list);
      })
      .catch(() => {
        listNotifications({ limit: 20 })
          .then((resp) => {
            const list = Array.isArray(resp) ? resp : resp?.items;
            setItems(Array.isArray(list) ? list : prevItems);
          })
          .catch(() => setItems(prevItems));
      })
      .finally(() => setActionBusy(false));
  }

  return (
    <>
      <IconButton color="inherit" onClick={openMenu} size="large" aria-label="Notifiche" sx={{ mr: 1 }}>
        <Badge color="error" badgeContent={unread} max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        PaperProps={{ sx: { width: 360, maxWidth: 'calc(100vw - 32px)' } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, pt: 1, pb: 1 }}>
          <Typography variant="subtitle1">Notifiche</Typography>
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} /> <Typography variant="body2">Caricamento…</Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>Nessuna notifica.</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {items.map((n) => {
              const unreadDot = !isRead(n);
              return (
                <ListItemButton
                  key={n._id}
                  onClick={() => onItemClick(n)}
                  sx={{ alignItems: 'flex-start', py: 1.2 }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {unreadDot && <FiberManualRecordIcon fontSize="inherit" sx={{ fontSize: 10 }} />}
                        <Typography variant="body2" sx={{ fontWeight: unreadDot ? 600 : 400 }}>
                          {n.title}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
                        {n.body || formatDate(n.createdAt)}
                      </Typography>
                    }
                  />
                  <Typography variant="caption" sx={{ opacity: 0.7, ml: 1, whiteSpace: 'nowrap' }}>
                    {formatDate(n.createdAt)}
                  </Typography>
                </ListItemButton>
              );
            })}
          </List>
        )}

        <Divider />
        <Box sx={{ p: 1, display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <Button size="small" onClick={onMarkAll} disabled={actionBusy || unread === 0}>
            Segna tutte come lette
          </Button>
          <Button size="small" onClick={onClearAll} disabled={actionBusy || items.length === 0} color="error">
            Svuota tutte
          </Button>
        </Box>
      </Menu>
    </>
  );
}


















