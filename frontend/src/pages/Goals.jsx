import { useEffect, useState, useCallback } from 'react';
import {
  Box, Stack, Typography, Paper, TextField, Button, IconButton,
  Select, MenuItem, FormControl, InputLabel, Chip, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert
} from '@mui/material';
import { Delete, Edit, Save, Close } from '@mui/icons-material';
import { listTasks, createTask, updateTask, deleteTask } from '../api/tasks';

// stati richiesti
const STATUS = {
  IN_CORSO: 'in_corso',
  IN_PAUSA: 'in_pausa',
  RAGGIUNTO: 'raggiunto',
  NON_RAGGIUNTO: 'non_raggiunto',
};
const statusLabel = (s)=>({
  [STATUS.IN_CORSO]: 'In corso',
  [STATUS.IN_PAUSA]: 'In pausa',
  [STATUS.RAGGIUNTO]: 'Raggiunto',
  [STATUS.NON_RAGGIUNTO]: 'Non raggiunto',
}[s] || '—');
const statusColor = (s)=>({
  [STATUS.IN_CORSO]: 'primary',
  [STATUS.IN_PAUSA]: 'default',
  [STATUS.RAGGIUNTO]: 'success',
  [STATUS.NON_RAGGIUNTO]: 'warning',
}[s] || 'default');

export default function Goals(){
  const [items,setItems] = useState([]);
  const [busy,setBusy] = useState(false);
  const [err,setErr] = useState('');

  // form nuovo
  const [newTitle,setNewTitle] = useState('');
  const [newDue,setNewDue] = useState('');
  const [newStatus,setNewStatus] = useState(STATUS.IN_CORSO);
  const [newNote,setNewNote] = useState('');

  const load = useCallback(async ()=>{
    setErr('');
    try{
      const data = await listTasks();   // deve restituire array di task
      setItems(data);
    }catch(e){
      console.error(e);
      setErr('Errore nel caricamento degli obiettivi.');
    }
  },[]);
  useEffect(()=>{ load(); },[load]);

  // CREA
  const add = async ()=>{
    if(!newTitle.trim()) return;
    setBusy(true); setErr('');
    try{
      await createTask({
        title: newTitle.trim(),
        dueDate: newDue || undefined,        // YYYY-MM-DD o vuoto
        status: newStatus,
        note: newNote,
        done: newStatus === STATUS.RAGGIUNTO, // coerenza
      });
      await load();
      setNewTitle(''); setNewDue(''); setNewStatus(STATUS.IN_CORSO); setNewNote('');
    }catch(e){
      console.error(e);
      setErr(e?.response?.data?.message || 'Impossibile creare l’obiettivo.');
    }finally{ setBusy(false); }
  };

  // UPDATE
  const patch = async (id, data)=>{
    setBusy(true); setErr('');
    try{
      await updateTask(id, data);
      await load();
    }catch(e){
      console.error(e);
      setErr(e?.response?.data?.message || 'Errore durante il salvataggio.');
    }finally{ setBusy(false); }
  };

  // DELETE
  const remove = async (id)=>{
    if(!window.confirm('Eliminare definitivamente questo obiettivo?')) return;
    setBusy(true); setErr('');
    try{
      await deleteTask(id);
      setItems(prev => prev.filter(it => it._id!==id));
    }catch(e){
      console.error(e);
      setErr(e?.response?.data?.message || 'Errore durante l’eliminazione.');
    }finally{ setBusy(false); }
  };

  return (
    <Box p={2}>
      <Stack spacing={2}>
        <Typography variant="h4">           I MIEI OBIETTIVI      </Typography>
        {err && <Alert severity="error">{err}</Alert>}

        {/* Nuovo obiettivo */}
        <Paper variant="outlined">
          <Box p={2}>
            <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems={{ md:'center' }}>
              <TextField label="Titolo obiettivo" value={newTitle} onChange={e=>setNewTitle(e.target.value)} required fullWidth />
              <TextField label="Scadenza" type="date" InputLabelProps={{ shrink: true }} value={newDue} onChange={e=>setNewDue(e.target.value)} />
              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id="status-label">Stato</InputLabel>
                <Select labelId="status-label" label="Stato" value={newStatus} onChange={e=>setNewStatus(e.target.value)}>
                  <MenuItem value={STATUS.IN_CORSO}>In corso</MenuItem>
                  <MenuItem value={STATUS.IN_PAUSA}>In pausa</MenuItem>
                  <MenuItem value={STATUS.RAGGIUNTO}>Raggiunto</MenuItem>
                  <MenuItem value={STATUS.NON_RAGGIUNTO}>Non raggiunto</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Note" value={newNote} onChange={e=>setNewNote(e.target.value)} fullWidth />
              <Button variant="contained" onClick={add} disabled={busy || !newTitle.trim()}>Aggiungi</Button>
            </Stack>
          </Box>
        </Paper>

        {/* Tabella semplice */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Tabella obiettivi">
            <TableHead>
              <TableRow>
                <TableCell>Titolo</TableCell>
                <TableCell width="25%">Note</TableCell>
                <TableCell width="14%">Scadenza</TableCell>
                <TableCell width="14%">Stato</TableCell>
                <TableCell width="16%">Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(row => (
                <Row key={row._id} row={row} onSave={patch} onRemove={remove} />
              ))}
              {!items.length && (
                <TableRow><TableCell colSpan={5}><Alert severity="info">Nessun obiettivo.</Alert></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Box>
  );
}

function Row({ row, onSave, onRemove }){
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(row.title || '');
  const [note, setNote] = useState(row.note || '');
  const [status, setStatus] = useState(row.status || (row.done ? 'raggiunto' : 'in_corso'));
  const [due, setDue] = useState(row.dueDate ? new Date(row.dueDate).toISOString().slice(0,10) : '');

  const save = ()=>{
    onSave(row._id, {
      title, note, status,
      done: status==='raggiunto',
      dueDate: due || null
    });
    setEdit(false);
  };

  return (
    <TableRow hover>
      <TableCell>
        {edit ? <TextField value={title} onChange={e=>setTitle(e.target.value)} size="small" fullWidth /> : row.title}
      </TableCell>
      <TableCell>
        {edit ? <TextField value={note} onChange={e=>setNote(e.target.value)} size="small" fullWidth /> : (row.note || '—')}
      </TableCell>
      <TableCell>
        {edit ? (
          <TextField type="date" size="small" value={due} onChange={e=>setDue(e.target.value)} InputLabelProps={{ shrink: true }} />
        ) : (row.dueDate ? new Date(row.dueDate).toLocaleDateString('it-IT') : '—')}
      </TableCell>
      <TableCell>
        {edit ? (
          <Select size="small" value={status} onChange={e=>setStatus(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="in_corso">In corso</MenuItem>
            <MenuItem value="in_pausa">In pausa</MenuItem>
            <MenuItem value="raggiunto">Raggiunto</MenuItem>
            <MenuItem value="non_raggiunto">Non raggiunto</MenuItem>
          </Select>
        ) : (
          <Chip label={statusLabel(row.status || (row.done?'raggiunto':'in_corso'))} color={statusColor(row.status || (row.done?'raggiunto':'in_corso'))} size="small" />
        )}
      </TableCell>
      <TableCell>
        {!edit ? (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Modifica"><IconButton size="small" onClick={()=>setEdit(true)}><Edit fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Elimina"><IconButton size="small" onClick={()=>onRemove(row._id)}><Delete fontSize="small" /></IconButton></Tooltip>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Salva"><IconButton size="small" onClick={save}><Save fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Annulla"><IconButton size="small" onClick={()=>setEdit(false)}><Close fontSize="small" /></IconButton></Tooltip>
          </Stack>
        )}
      </TableCell>
    </TableRow>
  );
}