// src/pages/therapist/TherapistDashboard.jsx
import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, TextField, Typography
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useAuth } from '../../context/AuthContext'
import {
  listAppointments,
  updateAppointment,
  cancelAppointment
} from '../../api/appointments'

function formatDT(d) {
  try { return new Date(d).toLocaleString() } catch { return '—' }
}

export default function TherapistDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // selezione paziente (per sezioni Diario/Questionario)
  const [selectedPatient, setSelectedPatient] = useState(null)

  // dialog riprogrammazione
  const [reschedOpen, setReschedOpen] = useState(false)
  const [reschedId, setReschedId] = useState(null)
  const [reschedDate, setReschedDate] = useState('')

  // modali placeholder Diario/Questionario
  const [openDiary, setOpenDiary] = useState(false)
  const [openQuest, setOpenQuest] = useState(false)

  async function load() {
    setError('')
    setLoading(true)
    try {
      const data = await listAppointments()   // il server filtra per therapist = utente loggato
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore caricamento appuntamenti.')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!authLoading && user?.role === 'therapist') load()
  }, [authLoading, user])

  async function onAccept(id) {
    setError('')
    try {
      await updateAppointment(id, { status: 'accepted' })
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore durante l’accettazione.')
    }
  }

  function openReschedule(id, currentDate) {
    setReschedId(id)
    const dt = new Date(currentDate || Date.now())
    const pad = (n) => String(n).padStart(2, '0')
    const v = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
    setReschedDate(v)
    setReschedOpen(true)
  }

  async function confirmReschedule() {
    if (!reschedId || !reschedDate) return
    setError('')
    try {
      await updateAppointment(reschedId, { date: reschedDate })
      setReschedOpen(false)
      setReschedId(null)
      setReschedDate('')
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore durante la riprogrammazione.')
    }
  }

  async function onCancel(id) {
    setError('')
    try {
      await cancelAppointment(id)
      // se cancelli quello selezionato, togli la selezione
      if (items.find(x => x._id === id)?.patient?._id === selectedPatient?._id) {
        setSelectedPatient(null)
      }
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore durante la cancellazione.')
    }
  }

  return (
    <Box className="container" sx={{ mt: 3, maxWidth: 980 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Dashboard Terapeuta</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* --- Appuntamenti --- */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: .5 }}>Appuntamenti</Typography>
        <Typography variant="body2" sx={{ opacity: .8, mb: 1 }}>
          Seleziona un appuntamento per attivare le sezioni Diario/Questionario del paziente.
        </Typography>

        {!loading && items.length === 0 && (
          <Typography sx={{ opacity: .8 }}>Nessun appuntamento.</Typography>
        )}

        <Stack spacing={1.5}>
          {items.map(a => {
            const isSelected = selectedPatient?._id && a.patient?._id === selectedPatient._id
            return (
              <Paper
                key={a._id}
                onClick={() => setSelectedPatient(a.patient || null)}
                sx={{
                  p: 1.5, display: 'flex', alignItems: 'center', gap: 2,
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  cursor: 'pointer'
                }}
                title="Click per selezionare questo paziente"
              >
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {a.patient?.name || a.patient?.email || 'Paziente'}
                    {isSelected && <Typography component="span" sx={{ ml: 1, fontSize: 12, opacity: .7 }}>(selezionato)</Typography>}
                  </Typography>
                  <Typography variant="body2">Data: {formatDT(a.date)}</Typography>
                  <Typography variant="body2" sx={{ opacity: .8 }}>
                    Stato: {a.status || 'pending'}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                  {a.status !== 'accepted' && (
                    <Button
                      size="small"
                      startIcon={<CheckIcon />}
                      onClick={(e) => { e.stopPropagation(); onAccept(a._id) }}
                    >
                      Accetta
                    </Button>
                  )}
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={(e) => { e.stopPropagation(); openReschedule(a._id, a.date) }}
                  >
                    Riprogramma
                  </Button>
                  <IconButton aria-label="Cancella" onClick={(e) => { e.stopPropagation(); onCancel(a._id) }}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      </Paper>

      {/* --- Diario (lettura) --- */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Diario (lettura)</Typography>
        <Typography variant="body2" sx={{ opacity: .8, mb: 1 }}>
          Seleziona un appuntamento/paziente e poi clicca “Vedi diario”.
        </Typography>
        <Button
          variant="outlined"
          disabled={!selectedPatient}
          onClick={() => setOpenDiary(true)}
        >
          Vedi diario del paziente
        </Button>
      </Paper>

      {/* --- Questionario iniziale (lettura) --- */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Questionario iniziale</Typography>
        <Typography variant="body2" sx={{ opacity: .8, mb: 1 }}>
          Seleziona un appuntamento/paziente e poi clicca “Vedi questionario”.
        </Typography>
        <Button
          variant="outlined"
          disabled={!selectedPatient}
          onClick={() => setOpenQuest(true)}
        >
          Vedi questionario del paziente
        </Button>
      </Paper>

      {/* Dialog riprogrammazione */}
      <Dialog open={reschedOpen} onClose={() => setReschedOpen(false)}>
        <DialogTitle>Riprogramma appuntamento</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            type="datetime-local"
            label="Nuova data e ora"
            InputLabelProps={{ shrink: true }}
            value={reschedDate}
            onChange={(e) => setReschedDate(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReschedOpen(false)}>Annulla</Button>
          <Button onClick={confirmReschedule} variant="contained">Salva</Button>
        </DialogActions>
      </Dialog>

      {/* Modale Diario - placeholder */}
      <Dialog open={openDiary} onClose={() => setOpenDiary(false)} fullWidth maxWidth="md">
        <DialogTitle>Diario – {selectedPatient?.name || selectedPatient?.email || 'Paziente'}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Qui verranno mostrati i contenuti del diario del paziente (solo lettura).
          </Typography>
          <Typography variant="body2" sx={{ opacity: .8 }}>
            Endpoint da collegare: GET /api/diary?patientId=... (visibile solo al terapeuta).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDiary(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      {/* Modale Questionario - placeholder */}
      <Dialog open={openQuest} onClose={() => setOpenQuest(false)} fullWidth maxWidth="md">
        <DialogTitle>Questionario iniziale – {selectedPatient?.name || selectedPatient?.email || 'Paziente'}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Qui verranno mostrati i dati del questionario iniziale del paziente.
          </Typography>
          <Typography variant="body2" sx={{ opacity: .8 }}>
            Endpoint da collegare: GET /api/questionnaire?patientId=... (solo terapeuta).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuest(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

