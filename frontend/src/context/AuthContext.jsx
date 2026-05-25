import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { userAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await userAPI.getMe();
      setUser(res.data);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCurrentUser(); }, [fetchCurrentUser]);

  const loginUser = useCallback((token) => {
    localStorage.setItem('token', token);
    setLoading(true);
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const logoutUser = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const updateLocalUser = useCallback((data) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, updateLocalUser, fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
