import { useEffect, useState } from 'react'
import { Alert, Box, Button, IconButton, Paper, TextField, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { createDiary, deleteDiary, listDiary } from '../api/diary'

export default function Diary() {
  const [items, setItems] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const data = await listDiary()
      setItems(data || [])
    } catch { setError('Errore nel caricamento del diario.') }
  }

  useEffect(() => { load() }, [])

  async function onCreate(e) {
    e.preventDefault()
    try {
      await createDiary({ text })
      setText('')
      load()
    } catch { setError('Errore nella creazione della nota.') }
  }

  async function onDelete(id) {
    try { await deleteDiary(id); load() } catch { setError('Errore nell\'eliminazione.') }
  }

  return (
    <Box className="container" sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Diario</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <form className="row" onSubmit={onCreate}>
          <TextField fullWidth label="Scrivi una nuova nota..." value={text} onChange={(e)=>setText(e.target.value)} />
          <Button type="submit" variant="contained">Aggiungi</Button>
        </form>
      </Paper>

      <div className="stack">
        {items.map(it => (
          <Paper key={it._id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{it.text}</Typography>
              <Typography variant="caption" sx={{ opacity: .7 }}>
                {new Date(it.createdAt).toLocaleString()}
              </Typography>
            </div>
            <IconButton onClick={()=>onDelete(it._id)} aria-label="Elimina"><DeleteIcon/></IconButton>
          </Paper>
        ))}
        {items.length === 0 && <Typography>Nessuna nota presente.</Typography>}
      </div>
    </Box>
  )
}
