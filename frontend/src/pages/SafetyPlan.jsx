import { useEffect, useState } from 'react';
import { Box, Stack, Typography, Paper, TextField, Button, Alert } from '@mui/material';
import { getSafetyPlan, saveSafetyPlan } from '../api/safetyPlan';

function parseLines(s){ return String(s||'').split('\n').map(x=>x.trim()).filter(Boolean); }
function joinLines(arr){ return (arr||[]).join('\n'); }

export default function SafetyPlan(){
  const [warning, setWarning] = useState('');
  const [coping, setCoping] = useState('');
  const [contacts, setContacts] = useState('');
  const [emerg, setEmerg] = useState('');
  const [err,setErr] = useState('');
  const [ok,setOk] = useState('');

  useEffect(()=>{
    (async ()=>{
      try {
        const sp = await getSafetyPlan();
        setWarning(joinLines(sp.warningSigns));
        setCoping(joinLines(sp.copingStrategies));
        setContacts(joinLines(sp.trustedContacts));
        setEmerg(sp.emergencyNotes || '');
      } catch {
        setErr('Errore nel caricamento del piano di sicurezza.');
      }
    })();
  },[]);

  const save = async ()=>{
    setErr(''); setOk('');
    try{
      await saveSafetyPlan({
        warningSigns: parseLines(warning),
        copingStrategies: parseLines(coping),
        trustedContacts: parseLines(contacts),
        emergencyNotes: emerg
      });
      setOk('Piano salvato correttamente.');
    } catch {
      setErr('Errore nel salvataggio.');
    }
  };

  return (
    <Box sx={{ p:2 }}>
      <Typography variant="h5" sx={{ mb:2 }}>Piano di sicurezza</Typography>
      {err && <Alert severity="error" sx={{ mb:2 }}>{err}</Alert>}
      {ok && <Alert severity="success" sx={{ mb:2 }}>{ok}</Alert>}

      <Paper variant="outlined" sx={{ p:2 }}>
        <Stack spacing={2}>
          <TextField label="Segnali d’allarme (uno per riga)" value={warning} onChange={e=>setWarning(e.target.value)} fullWidth multiline minRows={3} />
          <TextField label="Strategie rapide (uno per riga)" value={coping} onChange={e=>setCoping(e.target.value)} fullWidth multiline minRows={3} />
          <TextField label="Contatti fidati (uno per riga)" value={contacts} onChange={e=>setContacts(e.target.value)} fullWidth multiline minRows={3} />
          <TextField label="Note / numeri d’emergenza" value={emerg} onChange={e=>setEmerg(e.target.value)} fullWidth multiline minRows={3} />
          <Stack direction="row" justifyContent="flex-end">
            <Button variant="contained" onClick={save}>Salva</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
