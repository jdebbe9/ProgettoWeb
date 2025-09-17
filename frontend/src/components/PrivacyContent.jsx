// src/components/PrivacyContent.jsx
import { Box, Typography } from '@mui/material';

export default function PrivacyContent() {
  return (
    <Box sx={{ '& p': { mb: 2 } }}>
      <Typography variant="h6" gutterBottom>Informativa Privacy</Typography>

      {/* ⬇️ Sostituisci i paragrafi seguenti con il TUO testo già usato in /privacy */}
      <Typography variant="body2" component="div">
        <p>
          Questa informativa descrive le modalità di trattamento dei dati personali
          nell’ambito del progetto universitario “Le radici di sè”. I dati sono trattati
          esclusivamente per finalità di autenticazione, gestione degli appuntamenti,
          diario e questionari, nell’ambiente di test.
        </p>
        <p>
          Titolare del trattamento: Nome e contatti del responsabile del progetto.
          Base giuridica: consenso dell’utente. I dati non vengono ceduti a terzi al
          di fuori dell’ambiente di sviluppo e test.
        </p>
        <p>
          Diritti dell’interessato: accesso, rettifica, cancellazione, limitazione,
          opposizione. Per esercitare i diritti, contattare il Titolare ai recapiti indicati.
        </p>
        <p>
          Tempi di conservazione: limitati alla durata del progetto e comunque non oltre
          quanto necessario per gli scopi didattici. 
        </p>
      </Typography>
      {/* ⬆️ FINE segnaposto */}
    </Box>
  );
}
