// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material'

import { router } from './router/routes'
import AuthProvider from './context/AuthProvider'
import './styles/globals.css'

const theme = createTheme({
  palette: { mode: 'light' },
  shape: { borderRadius: 12 }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
