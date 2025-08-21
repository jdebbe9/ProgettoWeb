// src/components/ProfileDialog.jsx
import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, Typography, Chip, CircularProgress, Box
} from '@mui/material'
import { me as fetchMe } from '../api/auth' // usa la tua API /auth/me con axios + JWT

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

// Rileva "consenso privacy accettato" in vari schemi di backend
function isPrivacyAccepted(profile) {
  const p = profile || {}
  return Boolean(
    p.consent === true ||
    p.privacyConsent === true ||
    p.consents?.privacy === true ||
    p.consent?.privacy === true
  )
}

export default function ProfileDialog({ open, onClose, user }) {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  // All'apertura, prova a caricare il profilo completo (per avere surname/birthDate/consent ecc.)
  useEffect(() => {
    let active = true
    async function load() {
      if (!open) return
      setLoading(true); setError('')
      try {
        const data = await fetchMe() // deve restituire il profilo completo
        if (active) setProfile(data)
      } catch (e) {
        // fallback: usa quanto c'è in user
        if (active) {
          setProfile(user || null)
          setError(e?.response?.data?.message || e?.message || 'Impossibile caricare il profilo completo.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [open, user])

  const p = profile || user
  if (!p) return null

  const fields = [
    { label: 'Nome', value: p.name },
    { label: 'Cognome', value: p.surname },
    { label: 'Data di nascita', value: formatDate(p.birthDate) },
    { label: 'Email', value: p.email },
    {
      label: 'Consenso privacy',
      value: isPrivacyAccepted(p) ? 'Acconsentito' : 'Non acconsentito'
    },
    // opzionali: mostrali solo se esistono
    p.isMinor !== undefined ? { label: 'Minore', value: p.isMinor ? 'Sì' : 'No' } : null,
    p.parentFirstName ? { label: 'Nome genitore', value: p.parentFirstName } : null,
    p.parentLastName ? { label: 'Cognome genitore', value: p.parentLastName } : null,
    p.parentEmail ? { label: 'Email genitore', value: p.parentEmail } : null,
    p.parentPhone ? { label: 'Telefono genitore', value: p.parentPhone } : null,
    p.questionnaireDone !== undefined
      ? { label: 'Questionario iniziale', value: p.questionnaireDone ? 'Completato' : 'Non completato' }
      : null,
  ].filter(Boolean)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>Area personale</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Caricamento profilo…</Typography>
          </Box>
        ) : (
          <>
            {error && (
              <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Grid container spacing={2}>
              {fields.map((f, idx) => (
                <Grid key={idx} item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>{f.label}</Typography>
                  <Typography variant="body1">{f.value ?? '—'}</Typography>
                </Grid>
              ))}
            </Grid>

            {/* Tag riassuntivo per questionario (niente ruolo) */}
            {p.questionnaireDone !== undefined && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  color={p.questionnaireDone ? 'success' : 'default'}
                  label={p.questionnaireDone ? 'Questionario completato' : 'Questionario non completato'}
                />
              </div>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  )
}

