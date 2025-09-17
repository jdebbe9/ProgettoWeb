// src/pages/Register.jsx
import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert, Box, Button, Paper, TextField, Typography,
  FormControlLabel, Checkbox, FormHelperText, Link as MuiLink,
  InputAdornment, IconButton, Container
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { register as apiRegister } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import PrivacyDialog from '../components/PrivacyDialog'

// utils
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
const emptyToUndef = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v)

// schema
const baseSchema = z.object({
  name: z.string().min(2, 'Min 2 caratteri'),
  surname: z.string().min(2, 'Min 2 caratteri'),
  birthDate: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Data non valida'),
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Min 6 caratteri'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Devi accettare il consenso privacy.' }) }),

  parentFirstName: z.preprocess(emptyToUndef, z.string().min(2, 'Nome genitore non valido').optional()),
  parentLastName:  z.preprocess(emptyToUndef, z.string().min(2, 'Cognome genitore non valido').optional()),
  parentEmail:     z.preprocess(emptyToUndef, z.string().email('Email genitore non valida').optional()),
  parentPhone:     z.preprocess(emptyToUndef, z.string().min(6, 'Telefono genitore non valido').optional()),
  parentConsent:   z.boolean().optional(),
})
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
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }) }, [user, navigate])

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', surname: '', birthDate: '', email: '', password: '', consent: false,
      parentFirstName: '', parentLastName: '', parentEmail: '', parentPhone: '', parentConsent: false,
    }
  })

  const birthDate = useWatch({ control, name: 'birthDate' })
  const isMinor = useMemo(() => {
    const a = ageFromISO(birthDate)
    return a !== null && a < 18
  }, [birthDate])

  const onSubmit = async (values) => {
    setError('')
    try {
      await apiRegister({ ...values, isMinor: isMinor === true })
      navigate('/login')
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Registrazione non riuscita.')
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
      <Paper sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 2 }} elevation={3}>
        <Typography variant="h5" sx={{ mb: 2 }}> <strong>Registrati</strong></Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

       
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
            gap: 2,
            '& .MuiTextField-root': { width: '100%' },
            '& .MuiOutlinedInput-root': { borderRadius: 2 }
          }}
        >
       
          <TextField
            label="Nome"
            autoComplete="given-name"
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <TextField
            label="Cognome"
            autoComplete="family-name"
            {...register('surname')}
            error={!!errors.surname}
            helperText={errors.surname?.message}
          />

          
          <TextField
            label="Data di nascita"
            type="date"
            InputLabelProps={{ shrink: true }}
            autoComplete="bday"
            {...register('birthDate')}
            error={!!errors.birthDate}
            helperText={errors.birthDate?.message}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />

          
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              fullWidth
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                endAdornment: (
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
                )
              }}
            />
          </Box>

      
          <Box sx={{ gridColumn: '1 / -1' }}>
            <FormControlLabel
              sx={{ alignItems: 'flex-start', '.MuiTypography-root': { mt: '2px' } }}
              control={
                <Controller
                  name="consent"
                  control={control}
                  render={({ field }) => (
                    <Checkbox checked={!!field.value} onChange={(e)=>field.onChange(e.target.checked)} />
                  )}
                />
              }
              label={
                <span>
                  Acconsento al trattamento dei dati personali secondo l’{' '}
                  <MuiLink
                    component="button"
                    type="button"
                    onClick={() => setPrivacyOpen(true)}
                    sx={{ p: 0, m: 0, verticalAlign: 'baseline' }}
                  >
                    Informativa Privacy
                  </MuiLink>.
                </span>
              }
            />
            {errors.consent && <FormHelperText error>{errors.consent.message}</FormHelperText>}
          </Box>

       
          {isMinor && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Paper sx={{ p: 2, border: '1px dashed rgba(0,0,0,.18)', bgcolor: 'background.default' }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Dati genitore / tutore (obbligatori per minori)
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2
                  }}
                >
                  <TextField
                    label="Nome genitore"
                    {...register('parentFirstName')}
                    error={!!errors.parentFirstName}
                    helperText={errors.parentFirstName?.message}
                  />
                  <TextField
                    label="Cognome genitore"
                    {...register('parentLastName')}
                    error={!!errors.parentLastName}
                    helperText={errors.parentLastName?.message}
                  />
                  <TextField
                    label="Email genitore"
                    type="email"
                    {...register('parentEmail')}
                    error={!!errors.parentEmail}
                    helperText={errors.parentEmail?.message}
                  />
                  <TextField
                    label="Telefono genitore"
                    {...register('parentPhone')}
                    error={!!errors.parentPhone}
                    helperText={errors.parentPhone?.message}
                  />
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="parentConsent"
                          control={control}
                          render={({ field }) => (
                            <Checkbox checked={!!field.value} onChange={(e)=>field.onChange(e.target.checked)} />
                          )}
                        />
                      }
                      label="Dichiaro, in qualità di genitore/tutore, di prestare il consenso informato per la presa in carico del minore."
                    />
                    {errors.parentConsent && <FormHelperText error>{errors.parentConsent.message}</FormHelperText>}
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}

          
          <Box
            sx={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 0.5
            }}
          >
            <Typography variant="body2">
              Hai già un account? <RouterLink to="/login">Accedi</RouterLink>
            </Typography>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Invio…' : 'Crea account'}
            </Button>
          </Box>
        </Box>

      
        <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      </Paper>
    </Container>
  )
}
