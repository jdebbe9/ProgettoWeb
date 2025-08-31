import { useEffect, useState, useCallback } from 'react';
import { Box, Stack, Typography, Paper, TextField, Button, Checkbox, FormControlLabel, Alert } from '@mui/material';
import { listTasks, createTask, updateTask, deleteTask } from '../api/tasks';

export default function Goals(){
  const [items,setItems] = useState([]);
  const [title,setTitle] = useState('');
  const [due,setDue] = useState('');
  const [err,setErr] = useState('');
  const [busy,setBusy] = useState(false);

  const load = useCallback(async ()=>{
    try{ setItems(await listTasks()); }
    catch{ setErr('Errore nel caricamento obiettivi.'); }
  },[]);
  useEffect(()=>{ load(); },[load]);

  const add = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try{
      await createTask({ title: title.trim(), dueDate: due || undefined });
      setTitle(''); setDue(''); await load();
    }catch{ setErr('Errore nel salvataggio.'); }
    finally{ setBusy(false); }
  };

  const toggle = async (t) => {
    try { await updateTask(t._id, { done: !t.done }); await load(); }
    catch{ /* log dev */ }
  };

  const remove = async (t) => {
    if (!confirm('Eliminare questo obiettivo?')) return;
    try { await deleteTask(t._id); await load(); }
    catch{ /* log dev */ }
  };

  return (
    <Box sx={{ p:2 }}>
      <Typography variant="h5" sx={{ mb:2 }}>Obiettivi</Typography>
      {err && <Alert severity="error" sx={{ mb:2 }}>{err}</Alert>}

      <Paper variant="outlined" sx={{ p:2, mb:2 }}>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <TextField label="Nuovo obiettivo" value={title} onChange={e=>setTitle(e.target.value)} fullWidth />
          <TextField label="Scadenza" type="date" value={due} onChange={e=>setDue(e.target.value)} sx={{ maxWidth: 200 }} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={add} disabled={busy}>Aggiungi</Button>
        </Stack>
      </Paper>

      <Stack spacing={1}>
        {items.map(t=>(
          <Paper key={t._id} variant="outlined" sx={{ p:1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <FormControlLabel
                control={<Checkbox checked={!!t.done} onChange={()=>toggle(t)} />}
                label={
                  <Stack>
                    <Typography sx={{ textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString('it-IT') : '—'}
                    </Typography>
                  </Stack>
                }
              />
              <Button size="small" color="error" onClick={()=>remove(t)}>Elimina</Button>
            </Stack>
          </Paper>
        ))}
        {!items.length && <Alert severity="info">Nessun obiettivo al momento.</Alert>}
      </Stack>
    </Box>
  );
}
