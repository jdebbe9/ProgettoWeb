// src/router/routes.jsx
import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard from '../pages/Dashboard'
import Diary from '../pages/Diary'
import Appointments from '../pages/Appointments'
import Questionnaire from '../pages/Questionnaire'
import NotFound from '../pages/NotFound'
import ProtectedRoute from '../components/ProtectedRoute'
import Privacy from '../pages/Privacy'
import TherapistDashboard from '../pages/therapist/TherapistDashboard'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Login /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'privacy', element: <Privacy /> },

      // paziente
      {
        element: <ProtectedRoute roles={['patient','therapist']} />, // permette accesso base
        children: [
          { path: 'dashboard', element: <Dashboard /> }, // dashboard paziente
          { path: 'diary', element: <Diary /> },
          { path: 'appointments', element: <Appointments /> },
          { path: 'questionnaire', element: <Questionnaire /> }
        ]
      },

      // terapista
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


