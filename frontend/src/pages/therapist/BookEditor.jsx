import { useEffect, useState, useCallback } from 'react';
import { Box, Stack, Typography, TextField, Select, MenuItem, Button, Alert } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { createBook, getBook, updateBook } from '../../api/books';

export default function BookEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [isbn, setIsbn] = useState('');
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('recommended');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const b = await getBook(id);
      setTitle(b.title || '');
      setAuthor(b.author || '');
      setYear(b.year || '');
      setIsbn(b.isbn || '');
      setLink(b.link || '');
      setStatus(b.status || 'recommended');
      setNote(b.note || '');
    } catch {
      setErr('Errore nel caricamento libro');
    }
  }, [id, isNew]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      const payload = { title, author, year: year ? Number(year) : undefined, isbn, link, status, note };
      if (isNew) await createBook(payload);
      else await updateBook(id, payload);
      navigate('/therapist/books');
    } catch  {
      setErr('Errore nel salvataggio');
    }
  };

  return (
    <Box sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">{isNew ? 'Nuovo libro' : 'Modifica libro'}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/therapist/books')}>Annulla</Button>
          <Button variant="contained" onClick={save}>Salva</Button>
        </Stack>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2}>
        <TextField label="Titolo" value={title} onChange={e=>setTitle(e.target.value)} required fullWidth />
        <TextField label="Autore" value={author} onChange={e=>setAuthor(e.target.value)} fullWidth />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Anno" value={year} onChange={e=>setYear(e.target.value)} sx={{ maxWidth: 200 }} />
          <TextField label="ISBN" value={isbn} onChange={e=>setIsbn(e.target.value)} sx={{ maxWidth: 300 }} />
        </Stack>
        <TextField label="Link/Scheda" value={link} onChange={e=>setLink(e.target.value)} fullWidth />
        <Select value={status} onChange={e=>setStatus(e.target.value)} sx={{ maxWidth: 240 }}>
          <MenuItem value="recommended">Consigliato</MenuItem>
          <MenuItem value="reading">In lettura</MenuItem>
          <MenuItem value="read">Letto</MenuItem>
        </Select>
        <TextField label="Nota" value={note} onChange={e=>setNote(e.target.value)} fullWidth multiline minRows={4} />
      </Stack>
    </Box>
  );
}
