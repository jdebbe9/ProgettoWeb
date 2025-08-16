// src/pages/Login.jsx
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert, Box, Button, MenuItem, Paper, TextField, Typography
} from '@mui/material'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { me } from '../api/auth'

const schema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Min 6 caratteri'),
  role: z.enum(['patient', 'therapist'])
})

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'patient' }
  })
  const { login, user } = useAuth()
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // se già autenticato, vai alla dashboard corretta
  useEffect(() => {
    if (user) {
      navigate(user.role === 'therapist' ? '/therapist/dashboard' : '/dashboard', { replace: true })
    }
  }, [user, navigate])

  const onSubmit = async ({ email, password, role }) => {
    setError('')
    try {
      await login(email, password)              // autentica
      const data = await me()                   // ruolo effettivo dal server
      const finalRole = data?.user?.role
      if (!finalRole) { setError('Impossibile determinare il ruolo dell’account.'); return }
      if (finalRole !== role) {
        setError(`Questo account è di tipo "${finalRole}", non "${role}".`)
        return
      }
      navigate(role === 'therapist' ? '/therapist/dashboard' : '/dashboard')
    } catch {
      setError('Credenziali non valide.')
    }
  }

  return (
    <Box className="container" sx={{ mt: 6, maxWidth: 460 }}>
      <Paper sx={{ p: 3 }} elevation={3}>
        <Typography variant="h5" sx={{ mb: 2 }}>Accedi</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <TextField select label="Ruolo" defaultValue="patient" {...register('role')}>
            <MenuItem value="patient">Paziente</MenuItem>
            <MenuItem value="therapist">Terapeuta</MenuItem>
          </TextField>

          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Accesso…' : 'Login'}
          </Button>
        </form>

        <Typography sx={{ mt: 2 }} variant="body2">
          Non hai un account? <Link to="/register">Registrati</Link>
        </Typography>
      </Paper>
    </Box>
  )
}





