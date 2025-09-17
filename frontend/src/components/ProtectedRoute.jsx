// src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';

function hasRefreshCookie() {
  if (typeof document === 'undefined') return false;

  return document.cookie.indexOf('hasRefresh=1') !== -1;
}

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hasRefresh = hasRefreshCookie();

  
  if (!hasRefresh && !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  
  if (loading && !user && hasRefresh) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }


  if (!loading && !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  
  if (user && roles && !roles.includes(user.role)) {
    const target = user.role === 'therapist' ? '/therapist/dashboard' : '/dashboard';
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}





