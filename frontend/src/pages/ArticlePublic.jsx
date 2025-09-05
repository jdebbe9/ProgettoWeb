// frontend/src/pages/ArticlePublic.jsx
import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography, Chip, Stack, Alert, Button } from '@mui/material';
import { getPublishedArticle } from '../api/articles';

function formatDate(d) {
  try { return new Date(d).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return ''; }
}

export default function ArticlePublic() {
  const { id } = useParams();
  const [art, setArt] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getPublishedArticle(id);
        if (alive) setArt(data);
      } catch {
        if (alive) setErr('Articolo non trovato o non pubblicato.');
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (err) return (
    <Box sx={{ p:2 }}>
      <Alert severity="error" sx={{ mb:2 }}>{err}</Alert>
      <Button component={RouterLink} to="/materials" variant="outlined">Torna ai Materiali</Button>
    </Box>
  );

  if (!art) return <Box sx={{ p:2 }}><Typography>Caricamento…</Typography></Box>;

  return (
    <Box sx={{ p:2 }}>
      <Button component={RouterLink} to="/materials" variant="outlined" sx={{ mb:2 }}>← Torna ai Materiali</Button>
      <Paper variant="outlined" sx={{ p:2 }}>
        <Typography variant="h4" sx={{ mb:1 }}>{art.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>
          Pubblicato/aggiornato il {formatDate(art.updatedAt)}
        </Typography>

        {!!(art.tags && art.tags.length) && (
          <Stack direction="row" spacing={0.5} sx={{ mb:2, flexWrap:'wrap' }}>
            {art.tags.map((t,i)=> <Chip key={`${art._id}-tag-${i}`} size="small" label={t} />)}
          </Stack>
        )}

        {art.abstract && (
          <Typography sx={{ mb:2, whiteSpace:'pre-wrap' }} color="text.secondary">
            {art.abstract}
          </Typography>
        )}

        {art.body && (
          <Typography sx={{ whiteSpace:'pre-wrap' }}>
            {art.body}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
