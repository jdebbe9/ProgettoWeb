import { useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import { login as apiLogin, logout as apiLogout, me, refresh } from '../api/auth';
import { setAccessToken } from '../api/client';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refresh();
        const data = await me();
        if (mounted) setUser(data?.user || null);
      } catch {
        setAccessToken(null);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function login(email, password) {
    await apiLogin(email, password);
    const data = await me();
    setUser(data?.user || null);
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
