// frontend/src/pages/therapist/PatientDetails.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Paper, Stack, Tab, Tabs, Typography, TextField
} from '@mui/material';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { getPatientDetails } from '../../api/therapists';

function formatDT(d) {
  try { return new Date(d).toLocaleString('it-IT'); } catch { return '—'; }
}
function formatD(d) {
  try { return new Date(d).toLocaleDateString('it-IT', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric' }); } catch { return '—'; }
}

function useLocalNotes(key) {
  const [value, setValue] = useState(() => localStorage.getItem(key) || '');
  const save = (v) => { setValue(v); localStorage.setItem(key, v); };
  return [value, save];
}

export default function PatientDetails() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [data, setData]       = useState(null);
  const [tab, setTab]         = useState('overview');

  const [notes, setNotes] = useLocalNotes(`notes:patient:${id}`);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await getPatientDetails(id);
      setData(res);
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nel caricamento scheda paziente.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const questionnaire = data?.questionnaire;
  const diary = data?.diary || [];
  const appointments = data?.appointments || [];
  const user = data?.user;

  const latestAppt = useMemo(() => {
    const list = [...appointments].sort((a,b) => new Date(b.date) - new Date(a.date));
    return list[0];
  }, [appointments]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Scheda paziente — {user ? `${user.name} ${user.surname}` : ''}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <CircularProgress />}

      {!loading && data && (
        <>
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab value="overview" label="Overview" />
              <Tab value="questionnaire" label="Questionario" />
              <Tab value="diary" label="Diario" />
              <Tab value="appointments" label="Appuntamenti" />
              <Tab value="notes" label="Note (solo terapeuta)" />
            </Tabs>
          </Paper>

          {tab === 'overview' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Typography><b>Nome:</b> {user?.name} {user?.surname}</Typography>
                <Typography><b>Email:</b> {user?.email}</Typography>
                <Typography><b>Nato/a:</b> {user?.birthDate ? formatD(user.birthDate) : '—'}</Typography>
                <Divider sx={{ my: 1 }} />

                <Typography variant="subtitle2">Stato questionario</Typography>
                {questionnaire ? (
                  <Typography variant="body2" color="text.secondary">
                    Compilato il {formatDT(questionnaire.createdAt)} ({questionnaire.responses?.length || 0} risposte)
                  </Typography>
                ) : (
                  <Typography color="text.secondary">Non compilato</Typography>
                )}

                <Divider sx={{ my: 1 }} />

                <Typography variant="subtitle2">Ultimo appuntamento</Typography>
                {latestAppt ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography>{formatDT(latestAppt.date)}</Typography>
                    <Chip size="small" label={latestAppt.status} />
                    <Button
                      size="small"
                      component={RouterLink}
                      to={`/therapist/schedule?date=${new Date(latestAppt.date).toISOString().slice(0,10)}`}
                    >
                      Vai al giorno
                    </Button>
                  </Stack>
                ) : (
                  <Typography color="text.secondary">Nessun appuntamento registrato.</Typography>
                )}
              </Stack>
            </Paper>
          )}

          {tab === 'questionnaire' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              {!questionnaire ? (
                <Alert severity="info">Il paziente non ha ancora compilato il questionario.</Alert>
              ) : (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Compilato il {formatDT(questionnaire.createdAt)}
                  </Typography>
                  {(questionnaire.responses || []).map((qa, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography fontWeight="bold">{qa.question}</Typography>
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{qa.answer}</Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          )}

          {tab === 'diary' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              {(!diary || diary.length === 0) ? (
                <Alert severity="info">Nessuna voce di diario per questo paziente.</Alert>
              ) : (
                <Stack spacing={1}>
                  {diary.map(entry => (
                    <Paper key={entry._id} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">{formatDT(entry.createdAt)}</Typography>
                      <Typography sx={{ whiteSpace: 'pre-wrap', mt: .5 }}>{entry.content}</Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          )}

          {tab === 'appointments' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              {appointments.length === 0 ? (
                <Alert severity="info">Nessun appuntamento registrato.</Alert>
              ) : (
                <Stack spacing={1}>
                  {appointments.map(a => (
                    <Paper key={a._id} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <div>
                          <Typography fontWeight="bold">{formatDT(a.date)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Stato: {a.status}
                          </Typography>
                        </div>
                        <Button
                          size="small"
                          component={RouterLink}
                          to={`/therapist/schedule?date=${new Date(a.date).toISOString().slice(0,10)}`}
                        >
                          Vai al giorno
                        </Button>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          )}

          {tab === 'notes' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Queste note sono salvate solo sul tuo dispositivo (localStorage). In un passaggio futuro possiamo sincronizzarle lato server.
              </Typography>
              <TextField
                label="Appunti privati"
                fullWidth
                multiline
                minRows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
