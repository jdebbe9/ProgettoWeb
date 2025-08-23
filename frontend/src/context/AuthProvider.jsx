// src/context/AuthProvider.jsx
import { useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import api from '../api/axios';
import { disconnectSocket } from '../realtime/socket';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refresh iniziale + /me
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.post('/auth/refresh');
        const token = r?.data?.accessToken;
        if (token) localStorage.setItem('accessToken', token);
        const me = await api.get('/auth/me');
        if (alive) setUser(me.data);
      } catch {
        if (alive) {
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    const token = r?.data?.accessToken;
    if (token) localStorage.setItem('accessToken', token);
    const me = r?.data?.user || (await api.get('/auth/me')).data;
    setUser(me);
    return me;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); }
    catch (err) { if (import.meta.env.DEV) console.warn('[auth] logout failed', err); }
    finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      disconnectSocket();
    }
  };

  const value = useMemo(() => ({ user, setUser, login, logout, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}




