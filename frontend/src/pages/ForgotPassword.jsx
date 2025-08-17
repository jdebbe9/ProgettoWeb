import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Paper, TextField, Typography, Link as MuiLink } from '@mui/material'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'

const schema = z.object({ email: z.string().email('Email non valida') })

export default function ForgotPassword() {
  const [okMsg, setOkMsg] = useState('')
  const [devLink, setDevLink] = useState('')
  const [err, setErr] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async ({ email }) => {
    setErr(''); setOkMsg(''); setDevLink('')
    try {
      const data = await forgotPassword(email)
      setOkMsg(data?.message || 'Se esiste un account, riceverai un’email.')
      if (data?.devResetUrl) setDevLink(data.devResetUrl)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Errore richiesta reset.')
    }
  }

  return (
    <Box className="container" sx={{ mt: 6, maxWidth: 460 }}>
      <Paper sx={{ p: 3 }} elevation={3}>
        <Typography variant="h5" sx={{ mb: 2 }}>Recupera password</Typography>
        {okMsg && <Alert severity="success" sx={{ mb: 2 }}>{okMsg}</Alert>}
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField label="Email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Invio…' : 'Invia link reset'}
          </Button>
        </form>

        {devLink && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Ambiente di sviluppo: link diretto al reset:&nbsp;
            <MuiLink href={devLink} target="_blank" rel="noreferrer">{devLink}</MuiLink>
          </Alert>
        )}

        <Typography sx={{ mt: 2 }} variant="body2">
          Torna al <Link to="/login">login</Link>
        </Typography>
      </Paper>
    </Box>
  )
}
