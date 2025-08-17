// src/context/AuthProvider.jsx
import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { login as apiLogin, logout as apiLogout, me as apiMe, refresh as apiRefresh } from '../api/auth'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // bootstrap all'avvio: prova refresh + me
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await apiRefresh()             // cookie httpOnly → prova a rinnovare
        const data = await apiMe()
        if (!cancelled) setUser(data?.user ?? null)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // login che ritorna l'utente e chiude il loading (niente “pagina bianca”)
  async function login(email, password) {
    setLoading(true)
    await apiLogin(email, password)
    const data = await apiMe()
    const u = data?.user ?? null
    setUser(u)
    setLoading(false)
    return u
  }

  async function logout() {
    setLoading(true)
    try { await apiLogout() } finally {
      setUser(null)
      setLoading(false)
    }
  }

  const value = useMemo(() => ({ user, loading, login, logout, setUser }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

