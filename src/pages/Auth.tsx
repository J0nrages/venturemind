import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Auth() {
  usePageTitle('Sign In');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation (skip for forgot password)
    if (!isForgotPassword) {
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (isSignUp && password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast.success('Password reset instructions sent to your email');
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) {
          if (error.message.includes('email')) {
            setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
          } else if (error.message.includes('password')) {
            setErrors(prev => ({ ...prev, password: 'Password is too weak' }));
          } else {
            throw error;
          }
          return;
        }

        toast.success('Account created successfully! Please sign in.');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
            return;
          }
          throw error;
        }

        if (data.session) {
          toast.success('Signed in successfully!');
          navigate('/');
        }
      }
    } catch (error: any) {
      toast.error(
        error.message || 
        'An unexpected error occurred. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const resetView = () => {
    setIsForgotPassword(false);
    setIsSignUp(false);
    setErrors({});
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm"
      >
        {/* Card container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          
          {/* Logo and Title */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900">SYNA</span>
          </div>

          {/* Title */}
          <h1 className="text-lg font-medium text-center text-gray-900 mb-2">
            {isForgotPassword 
              ? 'Reset your password'
              : isSignUp 
                ? 'Create your account' 
                : 'Welcome back'}
          </h1>
          
          {!isForgotPassword && (
            <p className="text-sm text-gray-500 text-center mb-6">
              {isSignUp 
                ? 'Sign up to get started'
                : 'Sign in to your account'}
            </p>
          )}

          {/* Form */}
          <form onSubmit={isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-5">
            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-normal text-gray-700 block">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`h-10 text-sm ${errors.email ? 'border-red-500' : ''}`}
                placeholder="m@example.com"
              />
              {errors.email && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            {!isForgotPassword && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-normal text-gray-700">
                    Password
                  </Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Forgot your password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`h-10 pr-10 text-sm ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
              </div>
            )}

            {/* Submit button with consistent spacing */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all hover:shadow-md hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading 
                  ? 'Loading...' 
                  : isForgotPassword
                    ? 'Send Instructions'
                    : isSignUp 
                      ? 'Sign Up' 
                      : 'Login'}
              </button>
            </div>
          </form>

          {/* Footer links */}
          <div className="mt-6 text-center">
            {isForgotPassword ? (
              <button
                onClick={resetView}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to login
              </button>
            ) : (
              <p className="text-sm text-gray-600">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrors({});
                  }}
                  className="text-gray-900 hover:underline font-medium"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Terms and privacy */}
        {!isForgotPassword && (
          <p className="mt-4 text-xs text-center text-gray-500">
            By clicking continue, you agree to our{' '}
            <a href="#" className="underline hover:text-gray-700">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="underline hover:text-gray-700">
              Privacy Policy
            </a>
          </p>
        )}
      </motion.div>
    </div>
  );
}