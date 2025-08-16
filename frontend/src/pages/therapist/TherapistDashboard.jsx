// src/pages/therapist/TherapistDashboard.jsx
import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Divider, IconButton, Paper, TextField, Typography
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import EditCalendarIcon from '@mui/icons-material/EditCalendar'
import { listAppointments, updateAppointment } from '../../api/appointments'

export default function TherapistDashboard() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newDate, setNewDate] = useState('')

  async function load() {
    setError(''); setLoading(true)
    try {
      const data = await listAppointments() // lato backend filtra per terapeuta loggato
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError('Errore nel caricamento degli appuntamenti.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function accept(id) {
    try {
      await updateAppointment(id, { status: 'accepted' })
      load()
    } catch { setError('Errore durante l’accettazione.') }
  }

  async function reschedule(id) {
    if (!newDate) return
    try {
      await updateAppointment(id, { date: newDate })
      setEditingId(null); setNewDate('')
      load()
    } catch { setError('Errore nella riprogrammazione.') }
  }

  return (
    <Box className="container" sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Dashboard Terapeuta</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Appuntamenti</Typography>
        <Divider sx={{ mb: 2 }} />
        <div className="stack">
          {items.map(a => (
            <Paper key={a._id} sx={{ p: 2 }}>
              <Typography>
                Paziente: {a.patient?.name || a.patientName || a.patientEmail || '—'}
              </Typography>
              <Typography>
                Data: {a.date ? new Date(a.date).toLocaleString() : '—'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: .8 }}>
                Stato: {a.status || 'pending'}
              </Typography>

              <Box className="row" sx={{ mt: 1 }}>
                <Button
                  size="small"
                  startIcon={<CheckIcon />}
                  onClick={() => accept(a._id)}
                  disabled={a.status === 'accepted'}
                >
                  Accetta
                </Button>

                {editingId === a._id ? (
                  <>
                    <TextField
                      type="datetime-local"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                    <Button size="small" onClick={() => reschedule(a._id)}>Salva</Button>
                    <Button size="small" onClick={() => { setEditingId(null); setNewDate('') }}>Annulla</Button>
                  </>
                ) : (
                  <Button
                    size="small"
                    startIcon={<EditCalendarIcon />}
                    onClick={() => { setEditingId(a._id); setNewDate('') }}
                  >
                    Riprogramma
                  </Button>
                )}
              </Box>
            </Paper>
          ))}

          {!loading && items.length === 0 && (
            <Typography>Nessun appuntamento.</Typography>
          )}
        </div>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Diario (lettura)</Typography>
        <Typography variant="body2" sx={{ opacity: .8 }}>
          Placeholder: qui il terapeuta potrà leggere il diario del paziente
          selezionato (endpoint necessario dal backend). Al momento mostra solo questa nota.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" sx={{ mb: 1 }}>Questionario iniziale</Typography>
        <Typography variant="body2" sx={{ opacity: .8 }}>
          Placeholder: qui si visualizzerà il questionario iniziale inviato dal paziente.
        </Typography>
      </Paper>
    </Box>
  )
}
