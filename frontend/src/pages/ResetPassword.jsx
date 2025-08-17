import { useMemo, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'
import { resetPassword } from '../api/auth'

const schema = z.object({
  password: z.string().min(6, 'Min 6 caratteri'),
  confirm:  z.string()
}).refine(d => d.password === d.confirm, { message: 'Le password non coincidono', path: ['confirm'] })

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') || '', [params])
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
    useForm({ resolver: zodResolver(schema) })

  const onSubmit = async ({ password }) => {
    setErr(''); setOk('')
    try {
      await resetPassword({ token, password })
      setOk('Password aggiornata. Ora puoi accedere.')
      reset()
      setTimeout(() => navigate('/login'), 1000)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Reset non riuscito.')
    }
  }

  if (!token) {
    return (
      <Box className="container" sx={{ mt: 6, maxWidth: 460 }}>
        <Paper sx={{ p: 3 }} elevation={3}>
          <Alert severity="error">Token mancante o non valido. Richiedi un nuovo reset.</Alert>
          <Typography sx={{ mt: 2 }}><Link to="/forgot-password">Torna a “Recupera password”</Link></Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box className="container" sx={{ mt: 6, maxWidth: 460 }}>
      <Paper sx={{ p: 3 }} elevation={3}>
        <Typography variant="h5" sx={{ mb: 2 }}>Imposta nuova password</Typography>
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField label="Nuova password" type="password" {...register('password')}
                     error={!!errors.password} helperText={errors.password?.message} />
          <TextField label="Conferma password" type="password" {...register('confirm')}
                     error={!!errors.confirm} helperText={errors.confirm?.message} />
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Salvo…' : 'Salva nuova password'}
          </Button>
        </form>

        <Typography sx={{ mt: 2 }} variant="body2">
          Torna al <Link to="/login">login</Link>
        </Typography>
      </Paper>
    </Box>
  )
}
