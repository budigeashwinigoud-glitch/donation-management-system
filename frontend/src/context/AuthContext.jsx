import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

function storedUser() {
  try {
    return JSON.parse(sessionStorage.getItem('donation_user') || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (
    sessionStorage.getItem('donation_access_token') ? storedUser() : null
  ));

  function logout() {
    sessionStorage.removeItem('donation_access_token');
    sessionStorage.removeItem('donation_user');
    setUser(null);
  }

  useEffect(() => {
    window.addEventListener('auth:unauthorized', logout);
    return () => window.removeEventListener('auth:unauthorized', logout);
  }, []);

  async function login(email, password) {
    const result = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    sessionStorage.setItem('donation_access_token', result.access_token);
    sessionStorage.setItem('donation_user', JSON.stringify(result.user));
    setUser(result.user);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}