import { useEffect, useState, useCallback } from 'react';
import { Box, Stack, Typography, TextField, Select, MenuItem, Button, Alert } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { createArticle, getArticle, updateArticle } from '../../api/articles';

export default function ArticleEditor() {
  const { id } = useParams(); // 'new' oppure ObjectId
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('draft');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const a = await getArticle(id);
      setTitle(a.title || '');
      setAbstract(a.abstract || '');
      setBody(a.body || '');
      setTags(Array.isArray(a.tags) ? a.tags.join(', ') : '');
      setStatus(a.status || 'draft');
    } catch {
      setErr('Errore nel caricamento articolo');
    }
  }, [id, isNew]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      const payload = {
        title, abstract, body,
        tags: tags.split(',').map(s=>s.trim()).filter(Boolean),
        status
      };
      if (isNew) await createArticle(payload);
      else await updateArticle(id, payload);
      navigate('/therapist/articles');
    } catch {
      setErr('Errore nel salvataggio');
    }
  };

  return (
    <Box sx={{ p:2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">{isNew ? 'Nuovo articolo' : 'Modifica articolo'}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/therapist/articles')}>Annulla</Button>
          <Button variant="contained" onClick={save}>Salva</Button>
        </Stack>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Stack spacing={2}>
        <TextField label="Titolo" value={title} onChange={e=>setTitle(e.target.value)} required fullWidth />
        <TextField label="Abstract" value={abstract} onChange={e=>setAbstract(e.target.value)} fullWidth multiline minRows={2} />
        <TextField label="Corpo (markdown semplice)" value={body} onChange={e=>setBody(e.target.value)} fullWidth multiline minRows={8} />
        <TextField label="Tag (separati da virgola)" value={tags} onChange={e=>setTags(e.target.value)} fullWidth />
        <Select value={status} onChange={e=>setStatus(e.target.value)} sx={{ maxWidth: 240 }}>
          <MenuItem value="draft">Bozza</MenuItem>
          <MenuItem value="published">Pubblicato</MenuItem>
        </Select>
      </Stack>
    </Box>
  );
}
