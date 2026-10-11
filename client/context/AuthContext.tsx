import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/axios';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | string;
  company?: string;
  createdAt?: string | Date;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  fetchCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/api/auth/me');
      const userData = res.data.user || res.data.data?.user;
      if (userData) {
        setUser(userData);
        localStorage.setItem('inventra_user', JSON.stringify(userData));
      }
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        // Token is invalid or expired
        localStorage.removeItem('inventra_token');
        localStorage.removeItem('inventra_user');
        setUser(null);
        setToken(null);
      }
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('inventra_token');
      const savedUserStr = localStorage.getItem('inventra_user');

      if (savedToken) {
        setToken(savedToken);
        if (savedUserStr) {
          try {
            setUser(JSON.parse(savedUserStr));
          } catch {
            // ignore parse error
          }
        }
        await fetchCurrentUser();
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('inventra_token', newToken);
    localStorage.setItem('inventra_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('inventra_token');
    localStorage.removeItem('inventra_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('inventra_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        updateUser,
        fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
