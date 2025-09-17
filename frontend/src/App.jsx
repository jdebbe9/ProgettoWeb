// src/App.jsx
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import { useAuth } from './context/AuthContext'
import { Container } from '@mui/material'
import Footer from './components/Footer'

export default function App() {
  const { user } = useAuth()
  const { pathname } = useLocation()


  if (user && pathname === '/') {
    const target = user.role === 'therapist' ? '/therapist/dashboard' : '/dashboard'
    return <Navigate to={target} replace />
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg">
        <Outlet />
        <Footer />
      </Container>
    </>
  )
}


