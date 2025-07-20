import React, { useState } from 'react';
import { Mail, Shield, ArrowRight, CheckCircle, AlertCircle, Lock, UserPlus, Key } from 'lucide-react';
import { useAuth } from '../hook/useAuth.ts';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { 
    registerUser, 
    loginWithPassword, 
    sendVerificationCode, 
    verifyCodeandLogin,
    sendPasswordResetCode,
    resetPassword,
    isAuthenticated
  } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [step, setStep] = useState<'form' | 'verification' | 'reset-code'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!email.endsWith('@sanjaymaharjann.com.np')) {
      setError('Registration is only allowed for @sanjaymaharjann.com.np domain');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await registerUser(email, password);

    if (result.success) {
      setSuccess('Registration successful! Please verify your email.');
      setStep('verification');
    } else {
      setError(result.error || 'Registration failed');
    }

    setIsLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await loginWithPassword(email, password);

    if (result.success) {
      setSuccess('Login successful!');
      setTimeout(() => {
        if (isAuthenticated()) {
          onLogin();
        }
      }, 1000);
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await sendPasswordResetCode(email);

    if (result.success) {
      setSuccess('Password reset code sent to your email!');
      setStep('reset-code');
    } else {
      setError(result.error || 'Failed to send reset code');
    }

    setIsLoading(false);
  };

  const handleResetPassword = async () => {
    if (!resetToken || resetToken.length !== 6) {
      setError('Please enter a valid 6-digit reset code');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await resetPassword(email, resetToken, newPassword);

    if (result.success) {
      setSuccess('Password reset successful! You can now login.');
      setMode('login');
      setStep('form');
      setResetToken('');
      setNewPassword('');
    } else {
      setError(result.error || 'Password reset failed');
    }

    setIsLoading(false);
  };

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    
    const result = await sendVerificationCode(email);
    
    if (result.success) {
      setSuccess('Verification code sent to your email!');
      setStep('verification');
    } else {
      setError(result.error || 'Failed to send verification code');
    }
    
    setIsLoading(false);
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await verifyCodeandLogin(email, verificationCode);
    
    if (result.success) {
      setSuccess('Email verified successfully!');
      setTimeout(() => {
        if (isAuthenticated()) {
          onLogin();
        }
      }, 1000);
    } else {
      setError(result.error || 'Verification failed');
    }
    
    setIsLoading(false);
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError('');
    
    const result = mode === 'forgot' ? 
      await sendPasswordResetCode(email) : 
      await sendVerificationCode(email);
    
    if (result.success) {
      setSuccess(mode === 'forgot' ? 'New reset code sent!' : 'New verification code sent!');
    } else {
      setError(result.error || 'Failed to resend');
    }
    
    setIsLoading(false);
  };

  const goBackToForm = () => {
    setStep('form');
    setVerificationCode('');
    setResetToken('');
    setError('');
    setSuccess('');
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setResetToken('');
    setNewPassword('');
    setError('');
    setSuccess('');
    setStep('form');
  };

  const getTitle = () => {
    switch (mode) {
      case 'register': return 'Create Account';
      case 'forgot': return 'Reset Password';
      case 'reset': return 'Set New Password';
      default: return 'VM Debugger Access';
    }
  };

  const getSubtitle = () => {
    if (step === 'verification') {
      return mode === 'register' ? 
        'Enter the verification code sent to your email' :
        'Enter the verification code sent to your email';
    }
    if (step === 'reset-code') {
      return 'Enter the reset code sent to your email';
    }
    switch (mode) {
      case 'register': return 'Register with your @sanjaymaharjann.com.np email';
      case 'forgot': return 'Enter your email to receive a reset code';
      default: return 'Enter your credentials to access the VM debugger';
    }
  };

  return (
    <div className="min-h-screen professional-bg">
      {/* Animated background elements */}
      <div className="bg-effects">
        <div className="subtle-effect effect-1"></div>
        <div className="subtle-effect effect-2"></div>
      </div>

      <div className="container mx-auto px-6 py-8 flex items-center justify-center min-h-screen">
        <div className="login-container">
          {/* Header */}
          <div className="login-header">
            <div className="login-icon-wrapper">
              {mode === 'register' ? <UserPlus className="login-icon" /> :
               mode === 'forgot' ? <Key className="login-icon" /> :
               <Shield className="login-icon" />}
            </div>
            <h1 className="login-title">{getTitle()}</h1>
            <p className="login-subtitle">
              {getSubtitle()}
            </p>
          </div>

          {/* Login Form */}
          <div className="login-form">
            {step === 'form' ? (
              <div className="form-step">
                <div className="input-group">
                  <label className="input-label">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="professional-input"
                    placeholder={mode === 'register' ? 'your.name@sanjaymaharjann.com.np' : 'your.email@gmail.com'}
                    disabled={isLoading}
                  />
                  {mode === 'register' && (
                    <p className="input-hint">Only @sanjaymaharjann.com.np emails are allowed</p>
                  )}
                </div>

                {(mode === 'login' || mode === 'register') && (
                  <div className="input-group">
                    <label className="input-label">
                      <Lock className="w-4 h-4 inline mr-2" />
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="professional-input"
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                    {mode === 'register' && (
                      <p className="input-hint">Minimum 6 characters</p>
                    )}
                  </div>
                )}

                {mode === 'register' && (
                  <div className="input-group">
                    <label className="input-label">
                      <Lock className="w-4 h-4 inline mr-2" />
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="professional-input"
                      placeholder="Confirm your password"
                      disabled={isLoading}
                    />
                  </div>
                )}

                {mode === 'login' ? (
                  <button
                    onClick={handleLogin}
                    disabled={isLoading || !email || !password}
                    className="auth-button"
                    type="button"
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        Login
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                ) : mode === 'register' ? (
                  <button
                    onClick={handleRegister}
                    disabled={isLoading || !email || !password || !confirmPassword}
                    className="auth-button"
                    type="button"
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <UserPlus className="w-5 h-5" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleForgotPassword}
                    disabled={isLoading || !email}
                    className="auth-button"
                    type="button"
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        Send Reset Code
                        <Key className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}

                {/* Mode switching buttons */}
                <div className="flex flex-col gap-2 mt-4">
                  {mode === 'login' && (
                    <>
                      <button onClick={() => { setMode('register'); resetForm(); }} className="resend-btn" type="button">
                        Don't have an account? Register
                      </button>
                      <button onClick={() => { setMode('forgot'); resetForm(); }} className="resend-btn" type="button">
                        Forgot your password?
                      </button>
                      <button onClick={() => { handleSendCode(); }} className="resend-btn" type="button">
                        Login with verification code instead
                      </button>
                    </>
                  )}
                  {mode === 'register' && (
                    <button onClick={() => { setMode('login'); resetForm(); }} className="resend-btn" type="button">
                      Already have an account? Login
                    </button>
                  )}
                  {mode === 'forgot' && (
                    <button onClick={() => { setMode('login'); resetForm(); }} className="resend-btn" type="button">
                      Back to Login
                    </button>
                  )}
                </div>
              </div>
            ) : step === 'verification' ? (
              <div className="form-step">
                <div className="verification-info">
                  <p className="verification-email">Code sent to: <strong>{email}</strong></p>
                  <button onClick={goBackToForm} className="change-email-btn" type="button">
                    Change email
                  </button>
                </div>

                <div className="input-group">
                  <label className="input-label">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="professional-input verification-input"
                    placeholder="123456"
                    maxLength={6}
                    disabled={isLoading}
                  />
                  <p className="input-hint">Enter the 6-digit code from your email</p>
                </div>

                <button
                  onClick={handleVerifyCode}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="auth-button"
                  type="button"
                >
                  {isLoading ? (
                    <>
                      <div className="spinner" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Login
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button onClick={handleResendCode} className="resend-btn" disabled={isLoading} type="button">
                  Resend Code
                </button>
              </div>
            ) : (
              <div className="form-step">
                <div className="verification-info">
                  <p className="verification-email">Reset code sent to: <strong>{email}</strong></p>
                  <button onClick={goBackToForm} className="change-email-btn" type="button">
                    Change email
                  </button>
                </div>

                <div className="input-group">
                  <label className="input-label">
                    <Key className="w-4 h-4 inline mr-2" />
                    Reset Code
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="professional-input verification-input"
                    placeholder="123456"
                    maxLength={6}
                    disabled={isLoading}
                  />
                  <p className="input-hint">Enter the 6-digit reset code from your email</p>
                </div>

                <div className="input-group">
                  <label className="input-label">
                    <Lock className="w-4 h-4 inline mr-2" />
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="professional-input"
                    placeholder="Enter new password"
                    disabled={isLoading}
                  />
                  <p className="input-hint">Minimum 6 characters</p>
                </div>

                <button
                  onClick={handleResetPassword}
                  disabled={isLoading || resetToken.length !== 6 || !newPassword}
                  className="auth-button"
                  type="button"
                >
                  {isLoading ? (
                    <>
                      <div className="spinner" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button onClick={handleResendCode} className="resend-btn" disabled={isLoading} type="button">
                  Resend Reset Code
                </button>
              </div>
            )}

            {/* Status Messages */}
            {error && (
              <div className="status-message error-message">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="status-message success-message">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            )}
          </div>

          {/* Demo Info */}
          <div className="demo-info">
            <h4>Demo Instructions:</h4>
            <p>• Registration: Use @sanjaymaharjann.com.np email for account creation</p>
            <p>• Verification: Check your Gmail inbox for verification codes</p>
            <p>• Login: Use any verified email and password</p>
            <p>• Password Reset: Available for all registered users</p>
            <p>• Codes expire in 10-15 minutes for security</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;