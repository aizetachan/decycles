import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, User, Briefcase, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI, JoinModalMode } from '../../contexts/UIContext';
import { useT } from '../../contexts/LanguageContext';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const FRIENDLY_AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'That email already has an account. Try signing in instead.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/weak-password': 'Password is too weak — pick something at least 6 characters long.',
  'auth/user-not-found': 'No account with that email. Sign up first.',
  'auth/wrong-password': 'Wrong password. Try again or reset it.',
  'auth/invalid-credential': 'Email or password is wrong.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
};

const friendly = (err: any): string => {
  const code = err?.code;
  if (code && FRIENDLY_AUTH_ERRORS[code]) return FRIENDLY_AUTH_ERRORS[code];
  return err?.message || 'Something went wrong. Try again.';
};

export const JoinModal: React.FC<JoinModalProps> = ({ isOpen, onClose, isDarkMode }) => {
  const { signup, login, loginWithGoogle, requestPasswordReset } = useAuth();
  const { joinModalMode, setJoinModalMode } = useUI();
  const { t } = useT();
  const navigate = useNavigate();

  const [mode, setMode] = useState<JoinModalMode>(joinModalMode);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [joinType, setJoinType] = useState<'user' | 'creator' | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Local sub-mode: when true, sign-in is showing the "forgot password" form.
  const [isForgot, setIsForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Sync local mode with the requested mode whenever the modal is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setMode(joinModalMode);
      setStatus('idle');
      setJoinType(null);
      setErrorMsg(null);
      setIsForgot(false);
      setForgotSent(false);
    }
  }, [isOpen, joinModalMode]);

  if (!isOpen) return null;

  const reset = () => {
    setStatus('idle');
    setJoinType(null);
    setEmail('');
    setFirstName('');
    setLastName('');
    setPassword('');
    setShowPassword(false);
    setErrorMsg(null);
    setIsForgot(false);
    setForgotSent(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const switchMode = (next: JoinModalMode) => {
    setMode(next);
    setJoinModalMode(next);
    setErrorMsg(null);
    setJoinType(null);
    setIsForgot(false);
    setForgotSent(false);
  };

  // Always shows a neutral confirmation, regardless of whether the email
  // exists or has a password provider. This is required for compatibility
  // with Firebase email-enumeration protection and avoids leaking which
  // emails are registered. Errors are swallowed silently for the same reason.
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatus('submitting');
    try {
      await requestPasswordReset(email);
    } catch (err: any) {
      // Swallow user-not-found / invalid-email-shape on purpose.
      // Only surface unexpected errors (network / quota).
      const code = err?.code as string | undefined;
      if (code && !code.startsWith('auth/user-not-found') && !code.startsWith('auth/invalid-email')) {
        console.error('Password reset error:', err);
      }
    } finally {
      setStatus('idle');
      setForgotSent(true);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatus('submitting');
    try {
      await signup(email, password, firstName, lastName, joinType || 'user');
      setStatus('success');
      setTimeout(() => {
        handleClose();
        navigate('/profile/edit');
      }, 1500);
    } catch (err: any) {
      console.error('Signup error:', err);
      setErrorMsg(friendly(err));
      setStatus('idle');
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatus('submitting');
    try {
      await login(email, password);
      setStatus('success');
      setTimeout(() => {
        handleClose();
      }, 800);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(friendly(err));
      setStatus('idle');
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setStatus('submitting');
    try {
      // For sign-in, never pass a role — loginWithGoogle preserves the existing
      // doc when the user already exists. For sign-up, pass the chosen role.
      await loginWithGoogle(mode === 'signup' ? joinType || 'user' : undefined);
      setStatus('success');
      setTimeout(() => {
        handleClose();
        if (mode === 'signup') navigate('/profile/edit');
      }, 800);
    } catch (err: any) {
      console.error('Google auth error:', err);
      setErrorMsg(friendly(err));
      setStatus('idle');
    }
  };

  const inputClass = `w-full px-4 py-2 border focus:outline-none text-sm font-bold uppercase tracking-wider ${
    isDarkMode ? 'bg-black text-white border-white/30' : 'bg-white text-black border-black/20'
  }`;
  const labelClass = `block text-xs font-bold uppercase tracking-widest mb-1 ${
    isDarkMode ? 'text-gray-300' : 'text-gray-700'
  }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-2xl p-4 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto ${
          isDarkMode ? 'bg-black' : 'bg-white'
        }`}
      >
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 transition-colors ${
            isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'
          }`}
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className={`text-xl font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
          {mode === 'signin' ? `${t("header.login")} · DECYCLES.CC` : t("header.join")}
        </h2>
        <p className={`text-sm font-bold mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {mode === 'signin'
            ? 'Welcome back. Log in to access your profile.'
            : joinType === 'creator'
            ? 'Share your works, personal page links and create events.'
            : joinType === 'user'
            ? 'Create an account to save your favorite creators and events.'
            : 'Choose how you want to join our community.'}
        </p>

        {isForgot ? (
          forgotSent ? (
            // Neutral confirmation — never confirms whether the email exists or not.
            <div className="space-y-4">
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
              </p>
              <div className={`px-3 py-2 text-xs font-bold border-2 ${isDarkMode ? 'border-yellow-500/50 text-yellow-300 bg-yellow-500/10' : 'border-yellow-500/60 text-yellow-700 bg-yellow-500/10'}`}>
                ⚠ Check your spam / junk folder. The email can take a couple of minutes to arrive.
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                If you originally signed up with Google, the reset email won't arrive. Sign in with Google instead, and you can add a password from your profile so you can sign in either way next time.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsForgot(false); setForgotSent(false); }}
                  className={`w-full py-3 brutalist-border font-bold uppercase tracking-widest text-sm transition-colors ${
                    isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  Back to login
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleForgotSubmit}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Enter your account email and we'll send you a link to set a new password.
              </p>
              <div>
                <label className={labelClass}>{t("join.email")}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className={`w-full py-3 brutalist-border brutalist-shadow font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${
                    isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {status === 'submitting' ? 'Sending...' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsForgot(false)}
                  className={`text-xs font-bold uppercase tracking-widest hover:underline ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  ← Back to login
                </button>
              </div>
            </form>
          )
        ) : status === 'success' ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
              <svg className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-black'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className={`text-xl font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              {mode === 'signin' ? 'Logged in!' : 'Account Created!'}
            </h3>
            <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {mode === 'signin' ? 'Welcome back.' : 'Welcome to the community.'}
            </p>
          </div>
        ) : mode === 'signup' && !joinType ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setJoinType('user')}
                className={`p-4 sm:p-6 md:p-8 brutalist-border flex flex-col items-center justify-center gap-4 transition-colors group ${
                  isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'
                }`}
              >
                <User className={`w-12 h-12 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                <div className="text-center">
                  <h3 className={`text-lg font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>User</h3>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Save favorites and connect</p>
                </div>
              </button>
              <button
                onClick={() => setJoinType('creator')}
                className={`p-4 sm:p-6 md:p-8 brutalist-border flex flex-col items-center justify-center gap-4 transition-colors group ${
                  isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'
                }`}
              >
                <Briefcase className={`w-12 h-12 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                <div className="text-center">
                  <h3 className={`text-lg font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>Creator</h3>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Share your work and events</p>
                </div>
              </button>
            </div>
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`text-xs font-bold uppercase tracking-widest hover:underline ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                {t("join.haveAccount")}
              </button>
            </div>
          </>
        ) : (
          <form className="space-y-4" onSubmit={mode === 'signin' ? handleSignin : handleSignup}>
            {mode === 'signup' && (
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setJoinType(null)}
                  className={`text-xs font-bold uppercase tracking-widest hover:underline ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  ← Back
                </button>
                <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  / {joinType === 'user' ? 'User Account' : 'Creator Account'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {mode === 'signup' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("join.firstName")}</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("join.lastName")}</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className={labelClass}>{t("join.email")}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t("join.password")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    // `normal-case` overrides the global `uppercase` in inputClass —
                    // passwords are case-sensitive and showing them via the eye
                    // toggle must reflect what the user actually typed.
                    className={`${inputClass} pr-10 normal-case`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 transition-opacity ${
                      isDarkMode ? 'text-white/60 hover:text-white' : 'text-black/50 hover:text-black'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'signin' && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => { setIsForgot(true); setForgotSent(false); setErrorMsg(null); }}
                      className={`text-xs font-bold uppercase tracking-widest hover:underline ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className={`px-3 py-2 text-xs font-bold border-2 ${isDarkMode ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-red-500/50 text-red-600 bg-red-50'}`}>
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-3 mt-6">
              <button
                type="submit"
                disabled={status === 'submitting'}
                className={`w-full py-3 brutalist-border brutalist-shadow font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {status === 'submitting' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {mode === 'signin' ? 'Logging in...' : 'Creating Account...'}
                  </>
                ) : mode === 'signin' ? (
                  'Login'
                ) : (
                  'Create Account'
                )}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-400/30"></div>
                <span className={`flex-shrink-0 mx-4 text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Or</span>
                <div className="flex-grow border-t border-gray-400/30"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={status === 'submitting'}
                className={`w-full py-3 brutalist-border font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isDarkMode ? 'bg-black text-white hover:bg-white/10' : 'bg-white text-black hover:bg-black/5'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="mt-4 text-center">
              {mode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`text-xs font-bold uppercase tracking-widest hover:underline ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Don't have an account? <span className={isDarkMode ? 'text-white' : 'text-black'}>Sign up</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className={`text-xs font-bold uppercase tracking-widest hover:underline ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {t("join.haveAccount")}
                </button>
              )}
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
