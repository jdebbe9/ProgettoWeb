import { useState } from 'react'
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'
import { submitQuestionnaire } from '../api/questionnaire'

export default function Questionnaire() {
  const [answers, setAnswers] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setMsg('')
    setError('')
    try {
      await submitQuestionnaire({ answers }) // struttura semplice; adatta al tuo schema
      setMsg('Questionario inviato ✅')
      setAnswers('')
    } catch {
      setError('Errore nell\'invio del questionario.')
    }
  }

  return (
    <Box className="container" sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Questionario</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <form className="stack" onSubmit={onSubmit}>
          <TextField
            label="Risposte (JSON o testo libero)"
            multiline minRows={6}
            value={answers}
            onChange={(e)=>setAnswers(e.target.value)}
          />
          <Button type="submit" variant="contained">Invia</Button>
        </form>
      </Paper>
    </Box>
  )
}
