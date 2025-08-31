// frontend/src/components/ScheduleTabs.jsx
import { useEffect, useState } from 'react';
import { Tabs, Tab, Paper, Badge } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { listAppointments } from '../api/appointments';
import { connectSocket } from '../realtime/socket';

export default function ScheduleTabs() {
  const { pathname } = useLocation();
  const value = pathname.startsWith('/therapist/schedule/requests')
    ? 'requests'
    : pathname.startsWith('/therapist/schedule/availability')
    ? 'availability'
    : 'calendar';

  const [pending, setPending] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const apps = await listAppointments();
        const n = (Array.isArray(apps) ? apps : []).filter(a => a.status === 'pending').length;
        if (mounted) setPending(n);
      } catch (e) {
        if (import.meta?.env?.DEV) console.warn('[ScheduleTabs] load failed:', e);
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
            <Badge color="error" badgeContent={pending} invisible={pending === 0}>
              Richieste in attesa
            </Badge>
          }
        />
        <Tab value="availability" label="Disponibilità" component={RouterLink} to="/therapist/schedule/availability" />
      </Tabs>
    </Paper>
  );
}

