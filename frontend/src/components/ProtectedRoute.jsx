// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    const target = user.role === 'therapist' ? '/therapist/dashboard' : '/dashboard'
    return <Navigate to={target} replace />
  }

  return <Outlet />
}



