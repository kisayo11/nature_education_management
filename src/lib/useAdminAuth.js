'use client';

import { useState, useEffect } from 'react';

export function useAdminAuth() {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const stored = typeof window !== 'undefined' ? sessionStorage.getItem('nature_admin_auth') : null;
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      }
      setIsLoaded(true);
    };

    checkAuth();

    const handleStorage = () => checkAuth();
    window.addEventListener('nature_admin_auth_changed', handleStorage);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('nature_admin_auth_changed', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const login = (userData) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nature_admin_auth', JSON.stringify(userData));
      setUser(userData);
      window.dispatchEvent(new Event('nature_admin_auth_changed'));
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('nature_admin_auth');
      setUser(null);
      window.dispatchEvent(new Event('nature_admin_auth_changed'));
    }
  };

  return { user, isLoaded, isLoggedIn: !!user, login, logout };
}
