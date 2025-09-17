// frontend/src/components/patients/PatientDrawer.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Drawer, Paper, Stack, Typography, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink } from 'react-router-dom';
import { getPatientDetails } from '../../api/therapists';
import AssignToPatientDialog from './AssignToPatientDialog';

function formatDT(d) {
  try { return new Date(d).toLocaleString('it-IT'); } catch { return '—'; }
}
function formatD(d) {
  try { return new Date(d).toLocaleDateString('it-IT'); } catch { return '—'; }
}
function fullName(p) { return `${p?.name || ''} ${p?.surname || ''}`.trim(); }

export default function PatientDrawer({ open, onClose, patient }) {
  const patientId = patient?._id || patient?.id;
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [details, setDetails] = useState(null);


  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    let abort = false;
    async function load() {
      if (!open || !patientId) return;
      setLoading(true); setErr(''); setDetails(null);
      try {
        const data = await getPatientDetails(patientId);
        if (!abort) setDetails(data || null);
      } catch (e) {
        if (!abort) setErr(e?.response?.data?.message || 'Errore nel caricamento dettagli.');
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => { abort = true; };
  }, [open, patientId]);

  const diary = details?.diary || [];
  const questionnaire = details?.questionnaire || null;
  const appointments = details?.appointments || [];

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    const future = appointments.filter(a => {
      const t = a?.date ? new Date(a.date).getTime() : 0;
      return t >= now;
    });
    future.sort((a, b) => new Date(a.date) - new Date(b.date));
    return future[0] || null;
  }, [appointments]);

  const lastDiary = (diary || []).slice(0, 2);

  return (
    <Drawer
      anchor="right"
      open={!!open}
      onClose={onClose}
      transitionDuration={0}
      ModalProps={{ keepMounted: true }}
      sx={{
       
        '& .MuiDrawer-paper': { width: 440, p: 2, position: 'fixed' },
        
        '& .MuiDrawer-paperAnchorRight': { right: 0, left: 'auto' },
        '& .MuiDrawer-paperAnchorLeft':  { right: 0, left: 'auto' }
      }}
    >
      
      <IconButton
        aria-label="Chiudi"
        onClick={onClose}
        size="small"
        sx={{ position: 'absolute', top: 8, right: 8, left: 'auto' }}
      >
        <CloseIcon />
      </IconButton>

      {!patientId ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="info">Seleziona un paziente per vedere i dettagli.</Alert>
        </Box>
      ) : loading ? (
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={20} /> <Typography>Caricamento…</Typography>
          </Stack>
        </Box>
      ) : err ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>
        </Box>
      ) : !details ? null : (
        <Stack spacing={2}>
          
          <Box>
            <Typography variant="h6">{fullName(details.user)}</Typography>
            <Typography variant="body2" color="text.secondary">{details.user?.email}</Typography>
            {details.user?.birthDate && (
              <Typography variant="body2" color="text.secondary">
                Nato/a: {formatD(details.user.birthDate)}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
              {questionnaire ? (
                <Chip size="small" color="success" variant="outlined" label="Questionario compilato" />
              ) : (
                <Chip size="small" variant="outlined" label="Questionario non compilato" />
              )}
              <Chip size="small" variant="outlined" label={`Diario: ${diary.length}`} />
              <Chip size="small" variant="outlined" label={`Appuntamenti: ${appointments.length}`} />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
              <Button
                component={RouterLink}
                to={`/therapist/patients/${patientId}`}
                variant="contained"
                size="small"
              >
                Apri scheda completa
              </Button>
              <Button onClick={() => setAssignOpen(true)} size="small" variant="outlined">
                Assegna materiale
              </Button>
            </Stack>
          </Box>

          <Divider />

         
          <Box>
            <Typography variant="subtitle2">Questionario</Typography>
            {questionnaire ? (
              <Typography variant="body2" color="text.secondary">
                Compilato il {formatDT(questionnaire.createdAt)} — {questionnaire.responses?.length || 0} risposte
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">Non compilato</Typography>
            )}
          </Box>

          
          <Box>
            <Typography variant="subtitle2">Prossimo appuntamento</Typography>
            {nextAppointment ? (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography fontWeight="bold">{formatDT(nextAppointment.date)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Stato: {nextAppointment.status}
                </Typography>
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary">Nessun appuntamento imminente.</Typography>
            )}
          </Box>

          
          <Box>
            <Typography variant="subtitle2">Ultime voci di diario</Typography>
            {lastDiary.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Nessuna voce.</Typography>
            ) : (
              <Stack spacing={1}>
                {lastDiary.map(entry => (
                  <Paper key={entry._id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">{formatDT(entry.createdAt)}</Typography>
                    <Typography sx={{ whiteSpace: 'pre-wrap', mt: .5 }}>
                      {(entry.content || '').length > 200
                        ? (entry.content.slice(0, 200) + '…')
                        : (entry.content || '—')}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      )}

      
      <AssignToPatientDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        patient={details?.user}
        defaultType="Article"
      />
    </Drawer>
  );
}
