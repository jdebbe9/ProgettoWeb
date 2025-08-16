// src/pages/Register.jsx
import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert, Box, Button, Paper, TextField, Typography,
  FormControlLabel, Checkbox, FormHelperText
} from '@mui/material'
import { useNavigate, Link } from 'react-router-dom'
import { register as apiRegister } from '../api/auth'
import { useAuth } from '../context/AuthContext'

// util: calcola età da yyyy-mm-dd
function ageFromISO(dobStr) {
  if (!dobStr) return null
  const dob = new Date(dobStr)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

// schema base
const baseSchema = z.object({
  name: z.string().min(2, 'Min 2 caratteri'),
  surname: z.string().min(2, 'Min 2 caratteri'),
  birthDate: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Data non valida'),
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Min 6 caratteri'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Devi accettare il consenso privacy.' }) }),

  // campi genitore (opzionali a livello base, richiesti da superRefine se minore)
  parentFirstName: z.string().optional(),
  parentLastName: z.string().optional(),
  parentEmail: z.string().email('Email genitore non valida').optional(),
  parentPhone: z.string().min(6, 'Telefono non valido').optional(),
  parentConsent: z.boolean().optional()
})

// regola condizionale: se <18 → richiedi campi genitore + parentConsent true
const schema = baseSchema.superRefine((val, ctx) => {
  const age = ageFromISO(val.birthDate)
  const isMinor = age !== null && age < 18
  if (isMinor) {
    if (!val.parentFirstName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['parentFirstName'], message: 'Nome genitore obbligatorio' })
    if (!val.parentLastName)  ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['parentLastName'],  message: 'Cognome genitore obbligatorio' })
    if (!val.parentEmail)     ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['parentEmail'],     message: 'Email genitore obbligatoria' })
    if (!val.parentPhone)     ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['parentPhone'],     message: 'Telefono genitore obbligatorio' })
    if (!val.parentConsent)   ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['parentConsent'],   message: 'Consenso del genitore obbligatorio' })
  }
})

export default function Register() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }) }, [user, navigate])

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      consent: false,
      parentConsent: false
    }
  })

  // UI reattiva: mostra blocco genitore se minore
  const birthDate = useWatch({ control, name: 'birthDate' })
  const isMinor = useMemo(() => {
    const a = ageFromISO(birthDate)
    return a !== null && a < 18
  }, [birthDate])

  const onSubmit = async (values) => {
    setError('')
    try {
      await apiRegister({
        ...values,
        isMinor // lo mandiamo esplicitamente; il server può ricalcolare da birthDate
      })
      navigate('/login')
    } catch (e) {
      console.error('register error:', e)
      setError(e?.response?.data?.message || e?.message || 'Registrazione non riuscita.')
    }
  }

  return (
    <Box className="container" sx={{ mt: 6, maxWidth: 680 }}>
      <Paper sx={{ p: 3 }} elevation={3}>
        <Typography variant="h5" sx={{ mb: 2 }}>Registrati</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="row">
            <TextField label="Nome" {...register('name')} error={!!errors.name} helperText={errors.name?.message} sx={{ flex: 1, minWidth: 200 }} />
            <TextField label="Cognome" {...register('surname')} error={!!errors.surname} helperText={errors.surname?.message} sx={{ flex: 1, minWidth: 200 }} />
          </div>

          <TextField
            label="Data di nascita"
            type="date"
            InputLabelProps={{ shrink: true }}
            {...register('birthDate')}
            error={!!errors.birthDate}
            helperText={errors.birthDate?.message}
          />

          <TextField label="Email" type="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
          <TextField label="Password" type="password" {...register('password')} error={!!errors.password} helperText={errors.password?.message} />

          <div>
            <FormControlLabel
              control={<Controller name="consent" control={control} render={({ field }) => (
                <Checkbox checked={!!field.value} onChange={(e)=>field.onChange(e.target.checked)} />
              )} />}
              label={<span>Acconsento al trattamento dei dati personali secondo l’<Link to="/privacy">Informativa Privacy</Link>.</span>}
            />
            {errors.consent && <FormHelperText error>{errors.consent.message}</FormHelperText>}
          </div>

          {isMinor && (
            <Paper sx={{ p: 2, border: '1px dashed rgba(0,0,0,.2)' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Dati genitore / tutore (obbligatori per minori)</Typography>
              <div className="row">
                <TextField label="Nome genitore" {...register('parentFirstName')} error={!!errors.parentFirstName} helperText={errors.parentFirstName?.message} sx={{ flex: 1, minWidth: 200 }} />
                <TextField label="Cognome genitore" {...register('parentLastName')} error={!!errors.parentLastName} helperText={errors.parentLastName?.message} sx={{ flex: 1, minWidth: 200 }} />
              </div>
              <div className="row">
                <TextField label="Email genitore" type="email" {...register('parentEmail')} error={!!errors.parentEmail} helperText={errors.parentEmail?.message} sx={{ flex: 1, minWidth: 240 }} />
                <TextField label="Telefono genitore" {...register('parentPhone')} error={!!errors.parentPhone} helperText={errors.parentPhone?.message} sx={{ flex: 1, minWidth: 200 }} />
              </div>
              <FormControlLabel
                control={<Controller name="parentConsent" control={control} render={({ field }) => (
                  <Checkbox checked={!!field.value} onChange={(e)=>field.onChange(e.target.checked)} />
                )} />}
                label="Dichiaro, in qualità di genitore/tutore, di prestare il consenso informato per la presa in carico del minore."
              />
              {errors.parentConsent && <FormHelperText error>{errors.parentConsent.message}</FormHelperText>}
            </Paper>
          )}

          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Invio…' : 'Crea account'}
          </Button>
        </form>

        <Typography sx={{ mt: 2 }} variant="body2">
          Hai già un account? <Link to="/login">Accedi</Link>
        </Typography>
      </Paper>
    </Box>
  )
}



