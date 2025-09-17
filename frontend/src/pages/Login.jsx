// frontend/src/pages/Login.jsx
import { useState } from 'react';
import {
  Box, Paper, Stack, TextField, Button, Typography, Alert,
  IconButton, InputAdornment
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


export function LoginPanel() {
  const { login } = useAuth() || {};
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    setErr('');
    if (!email || !password) {
      setErr('Inserisci email e password.');
      return;
    }
    setBusy(true);
    try {
      const who = await login?.(email, password);
      const role = who?.role || who?.user?.role;
      if (role === 'therapist') navigate('/therapist/dashboard');
      else navigate('/dashboard');
    } catch (e2) {
      const msg = e2?.response?.data?.message || 'Credenziali non valide.';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, position: 'sticky', top: { xs: 16, md: 24 } }}
      component="form"
      onSubmit={onSubmit}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Accedi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Entra nel tuo spazio personale.
          </Typography>
        </Box>

        {err && <Alert severity="error">{err}</Alert>}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          fullWidth
        />
        <TextField
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPw(s => !s)} edge="end" aria-label="mostra/nascondi password">
                  {showPw ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        <Button type="submit" variant="contained" disabled={busy} fullWidth>
          {busy ? 'Accesso…' : 'Accedi'}
        </Button>

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
          
          <Typography variant="body2">
            <RouterLink to="/register">Crea un account</RouterLink>
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}


export default function Login() {
  return (
    <Box sx={{ px: 2, py: 6, display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: 420, maxWidth: '100%' }}>
        <LoginPanel />
      </Box>
    </Box>
  );
}








