import React, { useState, useEffect } from 'react';
import { Music2, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

interface AuthPageProps {
  onAuthenticated: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [phase, setPhase] = useState<'splash' | 'form' | 'loading'>('splash');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (phase === 'splash') {
        setPhase('form');
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleContinue = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    const name = username.trim() || 'MuzzieUser';
    if (name.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setError('Only letters, numbers, _ and - allowed');
      return;
    }

    setPhase('loading');
    setTimeout(() => onAuthenticated(), 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-muzzie overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-muzzie via-muzzie-green/20 to-muzzie" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-muzzie-copper/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-muzzie-green/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-muzzie-gold/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Splash phase */}
      {phase === 'splash' && (
        <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in duration-500">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-muzzie-copper to-muzzie-terracotta flex items-center justify-center shadow-2xl shadow-muzzie-copper/30 animate-bounce">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14">
              <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4"/>
              <path d="M24 20v20c0 3.3-3.6 6-8 6s-8-2.7-8-6 3.6-6 8-6c1.5 0 2.9.3 4 .8V16l16-4v18c0 3.3-3.6 6-8 6s-8-2.7-8-6 3.6-6 8-6c1.5 0 2.9.3 4 .8V12" fill="white" opacity="0.95"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Muzzie</h1>
          <p className="text-zinc-400 text-sm tracking-widest uppercase">AI Music Generator</p>
        </div>
      )}

      {/* Form phase */}
      {phase === 'form' && (
        <div className="relative z-10 w-full max-w-md px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Top gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-muzzie-copper via-muzzie-gold to-muzzie-green" />

            <div className="p-8 sm:p-10">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muzzie-copper to-muzzie-terracotta flex items-center justify-center shadow-lg shadow-muzzie-copper/20">
                  <Music2 className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Heading */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Muzzie</h2>
                <p className="text-zinc-400 text-sm">Create AI-powered music in seconds</p>
              </div>

              {/* Sign up form */}
              <form onSubmit={handleContinue} className="space-y-5">
                <div>
                  <label htmlFor="auth-username" className="block text-sm font-medium text-zinc-300 mb-2">
                    Choose your name
                  </label>
                  <div className="relative">
                    <input
                      id="auth-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter a username..."
                      className="w-full px-4 py-3.5 bg-zinc-800/60 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-muzzie-copper/50 focus:border-muzzie-copper/50 transition-all text-sm"
                      autoFocus
                    />
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-red-400">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-muzzie-copper to-muzzie-terracotta text-white font-semibold rounded-xl hover:from-muzzie-terracotta hover:to-muzzie-copper transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-muzzie-copper/20"
                >
                  <Sparkles size={18} />
                  Get Started
                  <ArrowRight size={18} />
                </button>
              </form>

              {/* Skip hint */}
              <p className="mt-5 text-xs text-zinc-500 text-center">
                Just enter any name or click Get Started to continue
              </p>
            </div>
          </div>

          {/* Features hint */}
          <div className="mt-6 flex justify-center gap-6 text-zinc-500 text-xs">
            <span className="flex items-center gap-1.5">
              <Music2 size={14} className="text-muzzie-copper" />
              Text to Music
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-muzzie-gold" />
              AI Powered
            </span>
          </div>
        </div>
      )}

      {/* Loading phase */}
      {phase === 'loading' && (
        <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muzzie-copper to-muzzie-terracotta flex items-center justify-center shadow-2xl shadow-muzzie-copper/30">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-zinc-400 text-sm">Setting up your studio...</p>
        </div>
      )}
    </div>
  );
};
