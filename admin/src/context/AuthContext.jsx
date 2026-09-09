import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import safeParse from '../utils/safeParse';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken || savedToken === 'undefined' || savedToken === 'null') {
      localStorage.removeItem('token');
      return null;
    }
    return savedToken;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const validateAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (!savedToken || savedToken === 'undefined' || savedToken === 'null') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (isMounted) {
          setToken(null);
          setUser(null);
          setAuthLoading(false);
        }
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const userData = response?.data?.data?.user || response?.data?.user;
        const role = String(userData?.role || '').toLowerCase();

        if (userData && (role === 'admin' || role === 'super admin' || role === 'superadmin')) {
          if (isMounted) {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } else {
          throw new Error('Unauthorized role for admin dashboard.');
        }
      } catch (error) {
        const is500OrOffline =
          !error.response ||
          error.response.status >= 500 ||
          error.code === 'ERR_NETWORK' ||
          error.message === 'Network Error';

        if (is500OrOffline) {
          console.warn('Backend server offline or returned 500:', error?.message);
          if (isMounted) {
            setServerError('Backend server is offline or returned 500 (port 5001). Please verify the backend service is running.');
            setAuthLoading(false);
          }
          return;
        }

        console.warn('Auth token validation failed:', error?.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    validateAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username, password) => {
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        username,
        password,
      });

      const authToken = response?.data?.data?.token || response?.data?.token;
      const userData = response?.data?.data?.user || response?.data?.user;

      if (!authToken || !userData) {
        throw new Error('Invalid login response from server.');
      }

      const role = String(userData?.role || '').toLowerCase();
      if (role !== 'admin' && role !== 'super admin' && role !== 'superadmin') {
        throw new Error('Access denied. Admin privileges required.');
      }

      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      console.error('Login Error:', error);

      const is500OrOffline =
        !error.response ||
        error.response.status >= 500 ||
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error';

      if (is500OrOffline) {
        setServerError('Backend server is offline or returned 500 (port 5001). Please verify the backend service is running.');
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setToken(null);
      setUser(null);

      return {
        success: false,
        is500: is500OrOffline,
        message: is500OrOffline
          ? '500 - Server Unavailable. Unable to connect to backend on port 5001.'
          : (error.response?.data?.message || error.message || 'Invalid username or password'),
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.warn('Backend logout API call warning:', error?.message);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authLoading,
        serverError,
        setServerError,
        clearServerError: () => setServerError(null),
        isAuthenticated: !!token && !!user && !authLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);