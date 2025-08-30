// src/context/AuthProvider.jsx
import { useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import api, { getAccessToken, setAccessToken } from '../api/axios';
import { connectSocket, disconnectSocket } from '../realtime/socket';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // == authLoading

  // All'avvio: se non ho un access token provo un refresh UNA volta.
  // Poi, se ho il token, chiamo /auth/me.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let token = getAccessToken();

        // Tenta il refresh solo se non abbiamo già un access token
        if (!token) {
          try {
            const { data } = await api.post('/auth/refresh', {});
            if (data?.accessToken) {
              setAccessToken(data.accessToken);
              token = data.accessToken;
            }
          } catch {
            // niente cookie di refresh o scaduto
            setAccessToken(null);
          }
        }

        // Se ho un token valido, recupero il profilo
        if (!cancelled) {
          if (token) {
            try {
              const me = await api.get('/auth/me');
              setUser(me.data || null);
            } catch {
              // token non valido -> pulizia
              setAccessToken(null);
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ⬇️ Appena abbiamo l'utente (dopo login o refresh), connetti il socket e fai join della sua stanza.
  useEffect(() => {
    if (!loading && user) {
      const uid = user.id || user._id;
      const s = connectSocket(uid);     // supporta sia versione con che senza argomento
      if (uid) s.emit('join', String(uid)); // safety join dopo (re)connect
    }
  }, [user, loading]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data?.accessToken) setAccessToken(data.accessToken);
    const me = data?.user || (await api.get('/auth/me')).data;
    setUser(me);
    return me;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[auth] logout failed (ignored)', err);
    } finally {
      setAccessToken(null);
      setUser(null);
      disconnectSocket();
    }
  };

  const value = useMemo(
    () => ({ user, setUser, login, logout, loading }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}






