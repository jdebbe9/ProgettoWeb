// src/pages/Login.jsx
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert, Box, Button, MenuItem, Paper, TextField, Typography,
  InputAdornment, IconButton, FormControl, OutlinedInput, InputLabel, FormHelperText
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
  // ⬇⬇⬇ aggiungo logout e un ref per capire se è in corso il submit
  const { login, logout, user } = useAuth()
  const duringSubmitRef = useRef(false)

  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  // ⬇⬇⬇ redireziona solo se NON siamo nel mezzo di un submit
  useEffect(() => {
    if (user && !duringSubmitRef.current) {
      navigate(user.role === 'therapist' ? '/therapist/dashboard' : '/dashboard', { replace: true })
    }
  }, [user, navigate])

  const onSubmit = async ({ email, password, role }) => {
    setError('')
    duringSubmitRef.current = true // ⬅ blocca il redirect dell'useEffect
    try {
      const u = await login(email, password) // ritorna l’utente
      if (!u) { setError('Impossibile determinare il ruolo.'); return }

      // ruolo richiesto dall'utente ≠ ruolo reale dell'account
      if (u.role !== role) {
        setError(`Accesso non autorizzato.`)
        // ⬇ IMPORTANTE: azzera user per evitare redirect automatico
        await logout()
        return
      }

      navigate(u.role === 'therapist' ? '/therapist/dashboard' : '/dashboard', { replace: true })
    } catch {
      setError('Credenziali non valide.')
    } finally {
      duringSubmitRef.current = false // riabilita redirect normale
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
            type="email"
            autoComplete="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
          />

          <FormControl variant="outlined" fullWidth error={!!errors.password}>
            <InputLabel htmlFor="login-password">Password</InputLabel>
            <OutlinedInput
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    onClick={() => setShowPassword(p => !p)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              label="Password"
              {...register('password')}
            />
            {errors.password && <FormHelperText>{errors.password.message}</FormHelperText>}
          </FormControl>

          <TextField select label="Ruolo" defaultValue="patient" {...register('role')} fullWidth>
            <MenuItem value="patient">Paziente</MenuItem>
            <MenuItem value="therapist">Terapeuta</MenuItem>
          </TextField>

          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Accesso…' : 'Login'}
          </Button>
        </form>

        <Typography sx={{ mt: 2 }} variant="body2">
          Non hai un account? <Link to="/register">Registrati</Link>
          {' · '}
          <Link to="/forgot-password">Password dimenticata?</Link>
        </Typography>
      </Paper>
    </Box>
  )
}








