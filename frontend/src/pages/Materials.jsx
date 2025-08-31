import { useEffect, useState, useCallback } from 'react';
import { Box, Stack, Typography, Paper, Chip, Button, Alert } from '@mui/material';
import { listAssignments, updateAssignment } from '../api/assignments';

function statusLabel(s){
  if (s==='done') return 'Letto';
  if (s==='in_progress') return 'In corso';
  return 'Da leggere';
}
export default function Materials(){
  const [items,setItems] = useState([]);
  const [err,setErr] = useState('');
  const [busy,setBusy] = useState(null);

  const load = useCallback(async ()=>{
    try{
      const list = await listAssignments();
      setItems(list);
    }catch{
      setErr('Errore nel caricamento materiali.');
    }
  },[]);
  useEffect(()=>{ load(); },[load]);

  const mark = async (id, status) => {
    setBusy(id);
    try { await updateAssignment(id, { status }); await load(); }
    catch{ /* log dev */ }
    finally{ setBusy(null); }
  };

  return (
    <Box sx={{ p:2 }}>
      <Typography variant="h5" sx={{ mb:2 }}>Materiali assegnati</Typography>
      {err && <Alert severity="error" sx={{ mb:2 }}>{err}</Alert>}

      <Stack spacing={1}>
        {items.map(a=>(
          <Paper key={a._id} variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <div>
                <Typography fontWeight="bold">
                  {a.item?.title || 'Elemento'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {a.itemType === 'Book' ? (a.item?.author || 'Libro') : 'Articolo'}
                </Typography>
                <Chip size="small" label={statusLabel(a.status)} sx={{ mt: 1 }} />
              </div>
              <Stack direction="row" spacing={1}>
                <Button size="small" disabled={busy===a._id} onClick={()=>mark(a._id,'in_progress')}>In corso</Button>
                <Button size="small" variant="contained" disabled={busy===a._id} onClick={()=>mark(a._id,'done')}>Segna letto</Button>
              </Stack>
            </Stack>
          </Paper>
        ))}
        {!items.length && <Alert severity="info">Non ci sono materiali assegnati.</Alert>}
      </Stack>
    </Box>
  );
}
