import { Outlet, useLocation, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import { useAuth } from './context/AuthContext'
import { Container } from '@mui/material'

export default function App() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  // Se l'utente è loggato e va a /, portalo in /dashboard
  if (user && pathname === '/') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg">
        <Outlet />
      </Container>
    </>
  )
}

