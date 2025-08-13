import { Card } from '@/components/ui/card';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function Auth() {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card/80 backdrop-blur-xl rounded-xl shadow-lg p-8"
      >
        <div className="flex items-center justify-center mb-8">
          <FileText className="w-8 h-8 text-emerald-600 mr-2" />
          <h1 className="text-2xl font-bold">DocuMind AI</h1>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-8">
          {isForgotPassword 
            ? 'Reset Password'
            : isSignUp 
              ? 'Create an account' 
              : 'Welcome back'}
        </h2>

        <form onSubmit={isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.email ? 'border-red-500' : 'border-border/50'
              }`}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.email}
              </p>
            )}
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.password ? 'border-red-500' : 'border-border/50'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading 
              ? 'Loading...' 
              : isForgotPassword
                ? 'Send Reset Instructions'
                : isSignUp 
                  ? 'Sign Up' 
                  : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {isForgotPassword ? (
            <button
              onClick={resetView}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Back to Sign In
            </button>
          ) : (
            <>
              {!isSignUp && (
                <button
                  onClick={() => setIsForgotPassword(true)}
                  className="text-emerald-600 hover:text-emerald-700 font-medium block mb-2"
                >
                  Forgot your password?
                </button>
              )}
              <p>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrors({});
                  }}
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}