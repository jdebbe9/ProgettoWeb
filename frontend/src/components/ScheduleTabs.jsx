// frontend/src/components/ScheduleTabs.jsx
import { useEffect, useState } from 'react';
import { Tabs, Tab, Paper, Badge } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { listAppointments } from '../api/appointments';
import { connectSocket } from '../realtime/socket';

export default function ScheduleTabs() {
  const { pathname } = useLocation();
  const value = pathname.startsWith('/therapist/schedule/requests') ? 'requests' : 'calendar';

  const [pending, setPending] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const apps = await listAppointments();
        if (!mounted) return;
        const count = (apps || []).filter(a => a.status === 'pending').length;
        setPending(count);
      } catch {
        setPending(0);
      }
    };
    load();

    const s = connectSocket();
    const reload = () => load();
    s.on('appointment:created', reload);
    s.on('appointment:updated', reload);
    s.on('appointment:removed', reload);
    s.on('appointment:deleted', reload);
    return () => {
      mounted = false;
      s.off('appointment:created', reload);
      s.off('appointment:updated', reload);
      s.off('appointment:removed', reload);
      s.off('appointment:deleted', reload);
    };
  }, []);

  return (
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <Tabs value={value} variant="scrollable" scrollButtons="auto">
        <Tab value="calendar" label="Calendario" component={RouterLink} to="/therapist/schedule" />
        <Tab
          value="requests"
          component={RouterLink}
          to="/therapist/schedule/requests"
          label={
            <Badge
              color="info"
              badgeContent={pending}
              invisible={pending === 0}
              overlap="rectangular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              sx={{
                '& .MuiBadge-badge': {
                  height: 6,
                  minWidth: 6,
                  fontSize: 0,
                  lineHeight: '6px',
                  px: 0.2,
                  borderRadius: '6px',
                  transform: 'translate(50%, -50%)', 
                },
              }}
            >
              Richieste in attesa
            </Badge>
          }
        />
      </Tabs>
    </Paper>
  );
}
