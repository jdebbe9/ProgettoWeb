// src/router/routes.jsx
import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard'
import Diary from '../pages/Diary'
import Appointments from '../pages/Appointments'
import Questionnaire from '../pages/Questionnaire'
import NotFound from '../pages/NotFound'
import ProtectedRoute from '../components/ProtectedRoute'
import TherapistDashboard from '../pages/therapist/TherapistDashboard'
import Privacy from '../pages/Privacy' // se non ce l'hai, rimuovi questa riga e la route /privacy

// 👇 nuove pagine per il recupero password
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'privacy', element: <Privacy /> }, // opzionale

      // 👇 rotte pubbliche per recupero password
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password',  element: <ResetPassword /> },

      // area utente (paziente/terapeuta per parti condivise)
      {
        element: <ProtectedRoute roles={['patient', 'therapist']} />,
        children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'diary', element: <Diary /> },
          { path: 'appointments', element: <Appointments /> },
          { path: 'questionnaire', element: <Questionnaire /> }
        ]
      },

      // area terapeuta
      {
        path: 'therapist',
        element: <ProtectedRoute roles={['therapist']} />,
        children: [
          { path: 'dashboard', element: <TherapistDashboard /> }
        ]
      }
    ]
  }
])




