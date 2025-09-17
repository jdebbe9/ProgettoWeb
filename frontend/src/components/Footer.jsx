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
    <Box
      component="footer"
      role="contentinfo"
      sx={{
        mt: { xs: 14, sm: 55 },
        bgcolor: 'background.paper',
        borderTop: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      <Container sx={{ py: { xs: 3, sm: 5 } }}>
        {/* Tre colonne sulla stessa riga */}
        <Grid
          container
          columnSpacing={{ xs: 2, sm: 4, md: 26 }}
          rowSpacing={{ xs: 3, md: 2 }}
          alignItems="flex-start"
        >
          {/* Colonna 1: Studio */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
              Le radici di sè
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1, color: 'primary.main' }}>
              Info Studio
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Dott. <strong>Felice Felicissimo</strong><br />
              Psicoterapeuta — Iscr. Albo Psicologi Puglia n. 1234
            </Typography>

            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocationOnIcon fontSize="small" color="primary" />
                <Typography variant="body2">Via Esempio 123, Bari (BA)</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <PhoneIcon fontSize="small" color="primary" />
                <Typography variant="body2">+39 000 000 0000</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <EmailIcon fontSize="small" color="primary" />
                <Typography variant="body2">
                  <MuiLink href="mailto:info@leradicidise.it" underline="hover">
                    info@leradicidise.it
                  </MuiLink>
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTimeIcon fontSize="small" color="primary" />
                <Typography variant="body2">Lun–Ven 9:00–19:00</Typography>
              </Stack>
            </Stack>
          </Grid>

          {/* Colonna 2: Legale */}
          <Grid item xs={12} md={4} mt={4}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1, color: 'primary.main' }}>
              Legale
            </Typography>
            <Stack spacing={0.75}>
              <MuiLink component={RouterLink} to="/privacy" underline="hover">
                Normativa Privacy
              </MuiLink>
            </Stack>
          </Grid>

          {/* Colonna 3: Social */}
          <Grid item xs={12} md={4} mt={4}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 0.5, color: 'primary.main' }}>
              Social
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                component="a"
                href="https://www.linkedin.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                color="primary"
              >
                <LinkedInIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                color="primary"
              >
                <InstagramIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                color="primary"
              >
                <FacebookIcon />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>

        {/* P.IVA + ALERT fuori dalla Grid, così l'alert riempie tutta la larghezza del Container */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            P.IVA: IT01234567890 &nbsp;•&nbsp; Informativa telemedicina / consenso informato disponibile su richiesta.
          </Typography>

          <Alert
            severity="warning"
            sx={{
              mt: 1.5,
              width: '100%',
              display: 'flex',
              flexWrap: 'nowrap',        // mai andare a capo nel flex
              overflowX: 'auto',         // se non basta lo spazio, scroll orizzontale
              scrollbarWidth: 'none',    // nascondi scrollbar (Firefox)
              '&::-webkit-scrollbar': { display: 'none' }, // nascondi scrollbar (WebKit)
              '& .MuiAlert-icon': { mr: 1.5, flexShrink: 0 },
              '& .MuiAlert-message': {
                whiteSpace: 'nowrap',    // una sola riga
                flexShrink: 0            // non comprimere il testo
              }
            }}
          >
            <span>
              <strong>Non è un servizio di emergenza.</strong> In caso di urgenza rivolgiti al Pronto Soccorso
              o chiama il 112.
            </span>
          </Alert>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Bottom bar */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            © {YEAR} Le radici di sè — Tutti i diritti riservati.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
