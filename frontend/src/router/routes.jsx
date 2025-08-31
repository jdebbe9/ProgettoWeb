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
import Patients from '../pages/therapist/Patients';
import PatientDetails from '../pages/therapist/PatientDetails';


// ⬇️ percorso CORRETTO (una cartella sopra)
import TherapistSchedule from '../pages/therapist/TherapistSchedule'
import TherapistProfile from '../pages/therapist/TherapistProfile';
import ScheduleRequests from '../pages/therapist/ScheduleRequests';
import ScheduleAvailability from '../pages/therapist/ScheduleAvailability';
import Articles from '../pages/therapist/Articles';
import ArticleEditor from '../pages/therapist/ArticleEditor';
import Books from '../pages/therapist/Books';
import BookEditor from '../pages/therapist/BookEditor';
import Materials from '../pages/Materials';
import Goals from '../pages/Goals';
import SafetyPlan from '../pages/SafetyPlan';




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
          { path: 'materials',     element: <Materials /> },
          { path: 'goals',         element: <Goals /> },
          { path: 'safety-plan',   element: <SafetyPlan /> },
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
          { path: 'schedule/requests',      element: <ScheduleRequests /> },
          { path: 'schedule/availability',  element: <ScheduleAvailability /> },
          { path: 'patients',      element: <Patients /> },
          { path: 'patients/:id',  element: <PatientDetails /> },
          { path: 'articles',        element: <Articles /> },
          { path: 'articles/new',    element: <ArticleEditor /> },
          { path: 'articles/:id',    element: <ArticleEditor /> },
          { path: 'books',           element: <Books /> },
          { path: 'books/new',       element: <BookEditor /> },
          { path: 'books/:id',       element: <BookEditor /> },
          { path: 'profile',   element: <TherapistProfile /> },
        ]
      }
    ]
  },
  { path: '*', element: <NotFound /> }
])







