// src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';

function hasRefreshCookie() {
  if (typeof document === 'undefined') return false;
  // il backend imposta hasRefresh=1 su path /api/auth/refresh
  return document.cookie.indexOf('hasRefresh=1') !== -1;
}

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hasRefresh = hasRefreshCookie();

  // 1) Primo accesso senza cookie di refresh -> nessun motivo per attendere: vai al login
  if (!hasRefresh && !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 2) Hai un refresh valido in corso -> attendi il bootstrap (spinner breve)
  if (loading && !user && hasRefresh) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 3) Bootstrap finito e ancora nessun utente -> login
  if (!loading && !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 4) Utente presente: verifica ruoli
  if (user && roles && !roles.includes(user.role)) {
    const target = user.role === 'therapist' ? '/therapist/dashboard' : '/dashboard';
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}





