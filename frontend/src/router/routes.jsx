import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from '../App'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard from '../pages/Dashboard'
import Diary from '../pages/Diary'
import Appointments from '../pages/Appointments'
import Questionnaire from '../pages/Questionnaire'
import NotFound from '../pages/NotFound'
import ProtectedRoute from '../components/ProtectedRoute'
import TherapistDashboard from '../pages/therapist/TherapistDashboard'
import Privacy from '../pages/Privacy'
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import Home from '../pages/Home'
import Profile from '../pages/Profile'

// ⬇️ percorso CORRETTO (una cartella sopra)
import TherapistSchedule from '../pages/therapist/TherapistSchedule'
import TherapistProfile from '../pages/therapist/TherapistProfile';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password/:token', element: <ResetPassword /> },

      // area utente (paziente)
      {
        element: <ProtectedRoute roles={['patient']} />,
        children: [
          { path: 'dashboard',     element: <Dashboard /> },
          { path: 'diary',         element: <Diary /> },
          { path: 'appointments',  element: <Appointments /> },
          { path: 'questionnaire', element: <Questionnaire /> },
          { path: 'profile',       element: <Profile /> },
        ]
      },

      // area terapeuta
      {
        path: 'therapist',
        element: <ProtectedRoute roles={['therapist']} />,
        children: [
          { index: true,           element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',     element: <TherapistDashboard /> },
          { path: 'schedule',      element: <TherapistSchedule /> },
          { path: 'profile',   element: <TherapistProfile /> },
        ]
      }
    ]
  },
  { path: '*', element: <NotFound /> }
])







