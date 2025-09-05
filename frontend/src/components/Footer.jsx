// src/components/Footer.jsx
import {
  Box, Container, Grid, Stack, Typography, Link as MuiLink, Divider, IconButton, Alert
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <Box component="footer" sx={{ mt: 6, bgcolor: 'background.paper', borderTop: (t)=>`1px solid ${t.palette.divider}` }}>
      <Container sx={{ py: { xs: 3, sm: 5 } }}>
        <Grid container spacing={4}>
          {/* Colonna 1: Studio */}
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Studio PsicoCare
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Dott. <strong>[Felice Felicissimo]</strong><br />
              Psicoterapeuta – Iscr. Albo Psicologi <em>[Regione]</em> n. <em>[XXXX]</em>
            </Typography>

            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocationOnIcon fontSize="small" />
                <Typography variant="body2">
                  <MuiLink
                    href="https://maps.google.com/?q=Indirizzo+Studio"
                    target="_blank" rel="noopener noreferrer"
                  >
                    Via Esempio 123, Città (XX)
                  </MuiLink>
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <PhoneIcon fontSize="small" />
                <Typography variant="body2">
                  <MuiLink href="tel:+390000000000">+39 000 000 0000</MuiLink>
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <EmailIcon fontSize="small" />
                <Typography variant="body2">
                  <MuiLink href="mailto:info@psicocare.it">info@psicocare.it</MuiLink>
                  {/* , PEC: <MuiLink href="mailto:studio@pec.it">studio@pec.it</MuiLink> */}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTimeIcon fontSize="small" />
                <Typography variant="body2">Lun–Ven 9:00–19:00</Typography>
              </Stack>
            </Stack>
          </Grid>

          {/* Colonna 2: Per i pazienti */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Per i pazienti</Typography>
            <Stack spacing={0.75}>
              <MuiLink component={RouterLink} to="/appointments" underline="hover">Appuntamenti</MuiLink>
              <MuiLink component={RouterLink} to="/materials" underline="hover">Materiali</MuiLink>
              <MuiLink component={RouterLink} to="/diary" underline="hover">Diario</MuiLink>
              <MuiLink component={RouterLink} to="/profile" underline="hover">Profilo</MuiLink>
            </Stack>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>Legale</Typography>
            <Stack spacing={0.75}>
              <MuiLink component={RouterLink} to="/privacy" underline="hover">Privacy</MuiLink>
              <MuiLink component={RouterLink} to="/terms" underline="hover">Termini di servizio</MuiLink>
              <MuiLink component={RouterLink} to="/cookies" underline="hover">Cookie</MuiLink>
              <MuiLink component={RouterLink} to="/accessibility" underline="hover">Accessibilità</MuiLink>
              {/* <MuiLink component="button" onClick={openCookiePrefs}>Preferenze cookie</MuiLink> */}
            </Stack>
          </Grid>

          {/* Colonna 3: Emergenze + Social */}
          <Grid item xs={12} md={5}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Non è un servizio di emergenza.</strong> In caso di urgenza rivolgiti al Pronto Soccorso
              o chiama il 112. Inserisci qui i numeri utili locali se necessario.
            </Alert>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Seguimi</Typography>
            <Stack direction="row" spacing={1}>
              <IconButton component="a" href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <LinkedInIcon />
              </IconButton>
              <IconButton component="a" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <InstagramIcon />
              </IconButton>
              <IconButton component="a" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <FacebookIcon />
              </IconButton>
            </Stack>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                P.IVA: <em>[IT01234567890]</em> &nbsp;•&nbsp; {/*
                SDI: <em>[XXXXXXX]</em> &nbsp;•&nbsp; */}
                Informativa telemedicina / consenso informato disponibile su richiesta.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Bottom bar */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            © {YEAR} Studio PsicoCare — Tutti i diritti riservati.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Costruito con PsicoCare • Versione {import.meta?.env?.VITE_APP_VERSION || '1.0'}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
