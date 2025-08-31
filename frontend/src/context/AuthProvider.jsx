// src/context/AuthProvider.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import api, { getAccessToken, setAccessToken } from '../api/axios';
import { connectSocket, disconnectSocket } from '../realtime/socket';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const bootOnceRef = useRef(false);

  // Silent refresh UNA volta solo se rilevo hasRefresh=1
  useEffect(() => {
    if (bootOnceRef.current) return;
    bootOnceRef.current = true;

    let cancelled = false;
    let token = getAccessToken();

    const hasRefreshCookie =
      typeof document !== 'undefined' &&
      document.cookie.indexOf('hasRefresh=1') !== -1;

    function loadMe() {
      return api.get('/auth/me').then(
        (me) => { if (!cancelled) setUser(me && me.data ? me.data : null); },
        () => {
          setAccessToken(null);
          if (!cancelled) setUser(null);
        }
      );
    }

    function doRefresh() {
      return fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      }).then(
        (resp) => (resp && resp.ok ? resp.json() : null),
        () => null
      ).then((data) => {
        const t = data && data.accessToken ? data.accessToken : null;
        if (t) {
          setAccessToken(t);
          token = t;
        } else {
          setAccessToken(null);
        }
      });
    }

    const chain = token
      ? Promise.resolve()
      : (hasRefreshCookie ? doRefresh() : Promise.resolve());

    chain
      .then(() => {
        if (cancelled) return null;
        return token ? loadMe() : (setUser(null), null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // Socket connect/disconnect
  useEffect(() => {
    if (loading) return;
    if (user) {
      const uid = user.id || user._id;
      const socket = connectSocket(uid);
      if (socket && socket.emit && uid) socket.emit('join', String(uid));
      return () => { if (socket && socket.disconnect) socket.disconnect(); };
    } else {
      disconnectSocket();
    }
  }, [user, loading]);

  const login = (email, password) =>
    api.post('/auth/login', { email, password }).then(({ data }) => {
      if (data && data.accessToken) setAccessToken(data.accessToken);
      const mePromise = data && data.user ? Promise.resolve({ data: data.user }) : api.get('/auth/me');
      return mePromise.then((me) => {
        const u = me && me.data ? me.data : null;
        setUser(u);
        return u;
      });
    });

  const logout = () =>
    api.post('/auth/logout').finally(() => {
      setAccessToken(null);
      setUser(null);
      disconnectSocket();
    });

  const value = useMemo(
    () => ({ user, setUser, login, logout, loading }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}








