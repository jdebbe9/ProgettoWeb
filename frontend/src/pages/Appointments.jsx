// src/pages/Appointments.jsx
import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, IconButton, Paper, TextField, Typography
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { createAppointment, listAppointments, cancelAppointment } from '../api/appointments'

const THERAPIST_ID = import.meta.env.VITE_THERAPIST_ID
const THERAPIST_NAME = import.meta.env.VITE_THERAPIST_NAME || 'Il tuo terapeuta'

export default function Appointments() {
  const [items, setItems] = useState([])
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setError(''); setLoading(true)
    try {
      const data = await listAppointments()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError('Errore caricamento appuntamenti.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function onCreate(e) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      // Adatta il nome campo se il backend usa "therapist" invece di "therapistId"
      await createAppointment({ date, therapistId: THERAPIST_ID })
      setDate('')
      await load()
    } catch (err) {
      const msg = err?.response?.data?.message || 'Errore creazione appuntamento.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function onCancel(id) {
    setError('')
    try { await cancelAppointment(id); await load() } catch { setError('Errore cancellazione.') }
  }

  return (
    <Box className="container" sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Appuntamenti</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <form className="row" onSubmit={onCreate}>
          <TextField
            type="datetime-local"
            label="Data e ora"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
          />
          <Button type="submit" variant="contained" disabled={submitting || !date}>
            {submitting ? 'Creo…' : 'Prenota con ' + THERAPIST_NAME}
          </Button>
        </form>
        <Typography variant="body2" sx={{ mt: 1, opacity: .8 }}>
          Terapeuta: <strong>{THERAPIST_NAME}</strong>
        </Typography>
      </Paper>

      <div className="stack">
        {items.map(a => (
          <Paper key={a._id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography>Data: {a.date ? new Date(a.date).toLocaleString() : '—'}</Typography>
              <Typography variant="body2" sx={{ opacity: .8 }}>
                Terapeuta: {a.therapist?.name || THERAPIST_NAME}
              </Typography>
            </div>
            <IconButton onClick={() => onCancel(a._id)} aria-label="Cancella"><DeleteIcon /></IconButton>
          </Paper>
        ))}
        {!loading && items.length === 0 && <Typography>Nessun appuntamento.</Typography>}
      </div>
    </Box>
  )
}


