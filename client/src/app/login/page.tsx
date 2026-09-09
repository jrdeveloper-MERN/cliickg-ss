'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, User, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, sendOtp, verifyOtp, resendOtp } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regStep, setRegStep] = useState<'phone' | 'name'>('phone');
  const [countryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePhoneChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
    if (error) setError('');
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit mobile number (must start with 6, 7, 8, or 9).');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(countryCode, cleanPhone, isRegisterMode);
      if (res.success) {
        setCooldown(30);
        setOtpSent(true);
        if (res.data?.otp) {
          setInfoMessage(`OTP sent! (Dev Mode OTP: ${res.data.otp})`);
        } else {
          setInfoMessage(`OTP sent to ${countryCode} ${cleanPhone}`);
        }
      } else {
        setError(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please check mobile number.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!otp || otp.trim().length !== 5) {
      setError('Please enter the 5-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp({
        countryCode,
        mobileNumber: phone.trim(),
        otp: otp.trim(),
        isRegistration: isRegisterMode,
        fullName: isRegisterMode && name.trim() ? name.trim() : undefined,
        email: isRegisterMode && email.trim() ? email.trim() : undefined,
      });

      if (res.success) {
        if (res.data?.needName || (isRegisterMode && !res.data?.token && !res.token)) {
          setRegStep('name');
          setInfoMessage('OTP verified successfully! Please enter your details to complete registration.');
        } else if (res.data?.token || res.token) {
          setInfoMessage('Login successful!');
          router.push('/');
        } else {
          setRegStep('name');
          setInfoMessage('OTP verified! Please enter your details to complete registration.');
        }
      } else {
        setError(res.message || 'Verification failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired 5-digit OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. user@example.com).');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp({
        countryCode,
        mobileNumber: phone.trim(),
        otp: otp.trim(),
        isRegistration: true,
        fullName: cleanName,
        email: cleanEmail ? cleanEmail : undefined,
      });
      if (res.success) {
        router.push('/');
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[min(100%-2rem,480px)] mx-auto py-16 pb-24">
      <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-200 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl font-light text-slate-900 m-0">
            {isRegisterMode ? (regStep === 'name' ? 'Complete Profile' : 'Create Customer Account') : 'Welcome Back'}
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 mb-0">
            {isRegisterMode ? (regStep === 'name' ? 'Enter your details below' : 'Register with mobile OTP') : 'Login using mobile OTP'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 border border-rose-200 p-3 rounded-lg text-xs mb-5 font-semibold">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs mb-5 font-semibold">
            {infoMessage}
          </div>
        )}

        {isRegisterMode && regStep === 'name' ? (
          <form onSubmit={handleCompleteRegistration} className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center border border-slate-300 rounded-lg p-2.5 px-3.5 focus-within:border-primary">
                <User size={18} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-none outline-none text-sm w-full bg-transparent text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Email Address</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>
              <div className="flex items-center border border-slate-300 rounded-lg p-2.5 px-3.5 focus-within:border-primary">
                <Mail size={18} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-none outline-none text-sm w-full bg-transparent text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary-hover text-white border-none py-3 rounded-lg font-bold text-sm cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? 'Completing Registration...' : 'Complete Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp} className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Mobile Number
              </label>
              <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:border-primary">
                <span className="bg-slate-50 py-2.5 px-3.5 text-sm font-bold text-slate-600 border-r border-slate-300">
                  {countryCode}
                </span>
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  disabled={otpSent}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  className="border-none outline-none text-sm py-2.5 px-3.5 w-full bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                  required
                />
              </div>
            </div>

            {otpSent && (
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  5-Digit OTP Code
                </label>
                <input
                  type="text"
                  placeholder="Enter 5-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  maxLength={5}
                  className="w-full border border-slate-300 focus:border-primary rounded-lg py-2.5 px-3.5 text-base tracking-widest text-center outline-none text-slate-800"
                  required
                />
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={() => resendOtp(countryCode, phone.trim(), isRegisterMode)}
                    className="bg-transparent border-none text-primary text-xs font-bold cursor-pointer disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary-hover text-white border-none py-3 rounded-lg font-bold text-sm cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? 'Processing...' : otpSent ? 'Verify OTP & Continue' : 'Send OTP'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        <div className="text-center mt-7 pt-5 border-t border-slate-100">
          {isRegisterMode ? (
            <p className="text-xs text-slate-500 m-0">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setOtpSent(false);
                  setError('');
                }}
                className="bg-transparent border-none text-primary font-bold cursor-pointer hover:underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500 m-0">
              New customer?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setOtpSent(false);
                  setError('');
                }}
                className="bg-transparent border-none text-primary font-bold cursor-pointer hover:underline"
              >
                Create an Account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
