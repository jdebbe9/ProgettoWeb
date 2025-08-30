// src/components/NotificationsBell.jsx
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
import { connectSocket, disconnectSocket } from '../realtime/socket';

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
  const { user } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const menuOpenRef = useRef(false);

  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);       // caricamento lista nel menu
  const [actionBusy, setActionBusy] = useState(false); // azioni bulk
  const pollRef = useRef(null);

  const uid = user?.id || user?._id;

  // Fetch iniziale del badge quando cambia utente
  useEffect(() => {
    if (!user) {
      setUnread(0);
      setItems([]);
      disconnectSocket();
      return;
    }
    (async () => {
      try {
        const c = await getUnreadCount();
        setUnread(c ?? 0);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[notifications] initial getUnreadCount failed', err);
      }
    })();
  }, [user]);

  // Socket + join room + listener realtime + poll difensivo
  useEffect(() => {
    if (!user) return;

    const s = connectSocket();

    // join nella room dell’utente (anche su reconnessione)
    const doJoin = () => { if (uid) s.emit('join', String(uid)); };
    doJoin();
    s.on('connect', doJoin);
    s.on('reconnect', doJoin);

    // quando arriva una nuova notifica:
    // - incrementa badge
    // - se il menu è aperto, prepend nella lista
    const onNew = (notif) => {
      setUnread((u) => (Number.isFinite(u) ? u + 1 : 1));
      if (menuOpenRef.current) {
        setItems((prev) => [notif, ...prev].slice(0, 20));
      }
    };
    s.on('notification:new', onNew);

    // poll del badge (fallback) ogni 25s (5s in dev)
    const pollMs = import.meta.env.DEV ? 2000 : 8000;
    const tick = async () => {
      try {
        const c = await getUnreadCount();
        setUnread(c ?? 0);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[notifications] poll getUnreadCount failed', err);
      }
    };
    pollRef.current = setInterval(tick, pollMs);

    return () => {
      s.off('connect', doJoin);
      s.off('reconnect', doJoin);
      s.off('notification:new', onNew);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, uid]);

  async function openMenu(e) {
    setAnchorEl(e.currentTarget);
    menuOpenRef.current = true;
    setLoading(true);
    try {
      const resp = await listNotifications({ limit: 20 });
      const list = Array.isArray(resp) ? resp : resp?.items;
      setItems(Array.isArray(list) ? list : []);
      const c = await getUnreadCount();
      setUnread(c ?? 0);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[notifications] list failed', err);
    } finally {
      setLoading(false);
    }
  }
  function closeMenu() {
    setAnchorEl(null);
    menuOpenRef.current = false;
  }

  async function onItemClick(n) {
    if (!isRead(n)) {
      try { await markRead(n._id); }
      catch (err) {
        if (import.meta.env.DEV) console.warn('[notifications] markRead failed (ignored)', err);
      }
      setItems(prev => prev.map(x =>
        x._id === n._id ? { ...x, readAt: x.readAt || new Date().toISOString(), read: true, isRead: true } : x
      ));
      setUnread(u => Math.max(0, Number(u) - 1));
    }
    const target = routeFor(n.type, user?.role);
    closeMenu();
    navigate(target);
  }

  async function onMarkAll() {
    setActionBusy(true);
    try {
      await markAllRead();
      // Ottimistico
      setItems(prev => prev.map(x => ({ ...x, readAt: x.readAt || new Date().toISOString(), read: true, isRead: true })));
      setUnread(0);
      // Refetch per allineare
      const [c, resp] = await Promise.all([
        getUnreadCount().catch(() => 0),
        listNotifications({ limit: 20 }).catch(() => null),
      ]);
      setUnread(Number(c) || 0);
      if (resp) {
        const list = Array.isArray(resp) ? resp : resp?.items;
        if (Array.isArray(list)) setItems(list);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[notifications] markAllRead failed', err);
    } finally {
      setActionBusy(false);
    }
  }

  async function onClearAll() {
    setActionBusy(true);
    const prevItems = items;
    const prevUnread = unread;

    try {
      // UI ottimistica
      setItems([]);
      setUnread(0);

      await deleteAll();

      // Refetch difensivo
      const [c, resp] = await Promise.all([
        getUnreadCount().catch(() => 0),
        listNotifications({ limit: 20 }).catch(() => null),
      ]);
      setUnread(Number(c) || 0);
      const list = Array.isArray(resp) ? resp : resp?.items;
      if (Array.isArray(list)) setItems(list);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[notifications] deleteAll failed — rollback via refetch', err);
      try {
        const [c, resp] = await Promise.all([
          getUnreadCount().catch(() => prevUnread),
          listNotifications({ limit: 20 }).catch(() => ({ items: prevItems })),
        ]);
        setUnread(Number(c) || 0);
        const list = Array.isArray(resp) ? resp : resp?.items;
        setItems(Array.isArray(list) ? list : prevItems);
      } catch {
        setUnread(prevUnread);
        setItems(prevItems);
      }
    } finally {
      setActionBusy(false);
    }
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
            {items.map(n => {
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
          <Button
            size="small"
            onClick={onClearAll}
            disabled={actionBusy || items.length === 0}
            color="error"
          >
            Svuota tutte
          </Button>
        </Box>
      </Menu>
    </>
  );
}











