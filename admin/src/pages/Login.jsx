import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight } from 'lucide-react';
import ErrorState from '../components/Common/ErrorState';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isServerError, setIsServerError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errors = { username: '', password: '' };
    let isValid = true;

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      errors.username = 'Username is required.';
      isValid = false;
    } else if (cleanUsername.length < 3) {
      errors.username = 'Username must be at least 3 characters long.';
      isValid = false;
    }

    if (!password) {
      errors.password = 'Password is required.';
      isValid = false;
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters long.';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: '' }));
    }
    if (error) {
      setError('');
      setIsServerError(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: '' }));
    }
    if (error) {
      setError('');
      setIsServerError(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsServerError(false);

    if (!validate()) {
      return;
    }

    const res = await login(username.trim(), password);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Invalid username or password.');
      if (res.is500) {
        setIsServerError(true);
      }
    }
  };

  if (isServerError) {
    return (
      <ErrorState
        statusCode={500}
        title="500 - Internal Server Error"
        message={error || 'Backend server is unavailable or not responding. Please ensure port 5001 is running.'}
        onRetry={() => {
          setIsServerError(false);
          setError('');
          window.location.reload();
        }}
        retryText="Retry Connection"
        showDashboardButton={false}
        fullScreen={true}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-admin-bg p-6">
      <div className="bg-admin-card border border-admin-border rounded-admin-sm shadow-admin-md w-full max-w-[400px] p-8 m-0">
        {/* Header Logo */}
        <div className="text-center mb-6">
          <h1 className="heading-2 text-xl">Ecommerce</h1>
          <p className="subheading mt-1">Sign in to admin portal</p>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-admin-danger p-3 rounded-admin-xs text-xs mb-4 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="form-label">Username</label>
            <div className="relative flex items-center">
              <User size={16} className="text-admin-text-muted absolute left-3 z-10 pointer-events-none" />
              <input
                type="text"
                className={`form-control !pl-10 ${fieldErrors.username ? '!border-rose-500 focus:!border-rose-500' : ''}`}
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter username"
              />
            </div>
            {fieldErrors.username && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.username}</p>
            )}
          </div>

          <div>
            <label className="form-label">Password</label>
            <div className="relative flex items-center">
              <Lock size={16} className="text-admin-text-muted absolute left-3 z-10 pointer-events-none" />
              <input
                type="password"
                className={`form-control !pl-10 ${fieldErrors.password ? '!border-rose-500 focus:!border-rose-500' : ''}`}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter password"
              />
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center mt-2 py-2.5"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

