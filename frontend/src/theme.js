// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f5b49',
      dark: '#0a3f33',
      light: '#4b8476',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0c643a',
      dark: '#094a2b',
      light: '#3a8f6a',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f7faf9',
      paper: '#ffffff',
    },
    text: {
      primary: '#11221d',
      secondary: '#4a5a56',
    },
    divider: 'rgba(15,91,73,0.14)',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"`,
    h1: { fontWeight: 700, letterSpacing: -0.5 },
    h2: { fontWeight: 700, letterSpacing: -0.3 },
    h3: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiAppBar: {
      defaultProps: { color: 'primary', elevation: 1 },
    },
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 16 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
  },
});

export default theme;
