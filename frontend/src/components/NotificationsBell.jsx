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
  getUnreadCount, listNotifications, markAllRead, markRead
} from '../api/notifications';
import { connectSocket, disconnectSocket } from '../realtime/socket';

const hasToken = () => !!localStorage.getItem('accessToken');
const isRead = (n) => Boolean(n?.readAt || n?.read || n?.isRead);

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

export default function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pollPaused, setPollPaused] = useState(false);
  const pollRef = useRef(null);

  // socket + poll (partono solo se c'è user E token)
  useEffect(() => {
    if (!user) {
      setUnread(0);
      setItems([]);
      disconnectSocket();
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (!hasToken()) {
      // niente token -> non partiamo (verrà sbloccato appena l’interceptor salverà un token)
      return;
    }

    // conteggio iniziale
    (async () => {
      try {
        const c = await getUnreadCount();
        setUnread(c ?? 0);
      } catch (err) {
        // se 401, pausa il poll
        setPollPaused(true);
        if (import.meta.env.DEV) console.warn('[notifications] initial getUnreadCount failed', err);
      }
    })();

    // socket
    const s = connectSocket();
    const uid = user?.id || user?._id;
    const doJoin = () => { if (uid) s.emit('join', String(uid)); };
    doJoin();
    s.on('connect', doJoin);
    s.on('reconnect', doJoin);

    const onNew = (notif) => {
      setUnread((u) => u + 1);
      setItems((prev) => [notif, ...prev].slice(0, 20));
    };
    s.on('notification:new', onNew);

    // poll difensivo del badge
    const pollMs = import.meta.env.DEV ? 5000 : 25000;
    const tick = async () => {
      // se non c'è token o abbiamo messo in pausa, non fare richieste
      if (!hasToken() || pollPaused) return;
      try {
        const c = await getUnreadCount();
        setUnread(c ?? 0);
      } catch (err) {
        // se 401, metti in pausa per evitare spam
        if (err?.response?.status === 401) {
          setPollPaused(true);
        }
        if (import.meta.env.DEV) console.warn('[notifications] poll getUnreadCount failed', err);
      }
    };
    pollRef.current = setInterval(tick, pollMs);

    return () => {
      s.off('notification:new', onNew);
      s.off('connect', doJoin);
      s.off('reconnect', doJoin);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [user, pollPaused]);

  // Se torna un token (es. dopo refresh riuscito), riattiva il poll
  useEffect(() => {
    if (user && hasToken()) setPollPaused(false);
  }, [user]);

  async function openMenu(e) {
    setAnchorEl(e.currentTarget);
    if (!hasToken()) return; // niente chiamate senza token
    setLoading(true);
    try {
      const resp = await listNotifications({ limit: 20 });
      const list = Array.isArray(resp) ? resp : resp?.items;
      setItems(Array.isArray(list) ? list : []);
      const c = await getUnreadCount();
      setUnread(c ?? 0);
    } catch (err) {
      if (err?.response?.status === 401) setPollPaused(true);
      if (import.meta.env.DEV) console.warn('[notifications] list failed', err);
    } finally {
      setLoading(false);
    }
  }
  function closeMenu() { setAnchorEl(null); }

  async function onItemClick(n) {
    if (!isRead(n) && hasToken()) {
      try { await markRead(n._id); } catch (err) {
        if (import.meta.env.DEV) console.warn('[notifications] markRead failed (ignored)', err);
      }
      setItems(prev => prev.map(x =>
        x._id === n._id ? { ...x, readAt: x.readAt || new Date().toISOString(), read: true, isRead: true } : x
      ));
      setUnread(u => Math.max(0, u - 1));
    }
    const target = routeFor(n.type, user?.role);
    closeMenu();
    navigate(target);
  }

  async function onMarkAll() {
    if (!hasToken()) return;
    try {
      await markAllRead();
      // ottimistico
      setItems(prev => prev.map(x => ({ ...x, readAt: x.readAt || new Date().toISOString(), read: true, isRead: true })));
      // refetch per allineare
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
      if (err?.response?.status === 401) setPollPaused(true);
      if (import.meta.env.DEV) console.warn('[notifications] markAllRead failed', err);
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
        <Box sx={{ p: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button size="small" onClick={onMarkAll} disabled={unread === 0 || !hasToken()}>
            Segna tutte come lette
          </Button>
        </Box>
      </Menu>
    </>
  );
}







