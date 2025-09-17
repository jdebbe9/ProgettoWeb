// src/context/AuthContext.jsx
/* eslint react-refresh/only-export-components: "off" */

import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { AuthContext };      
export default AuthContext;   





