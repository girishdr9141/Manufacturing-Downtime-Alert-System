import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, ArrowRight, Sun, Moon } from 'lucide-react';
// import { signIn, signUp, confirmSignUp } from 'aws-amplify/auth'; // Uncomment when AWS is deployed

interface AuthScreenProps {
  onLoginSuccess: (user: any, role: string, machineId?: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

type AuthMode = 'LOGIN' | 'SIGNUP' | 'CONFIRM';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, isDark, onToggleTheme }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState<'Admin' | 'Operator'>('Admin');
  const [machineId, setMachineId] = useState('EDGE-NODE-001');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'LOGIN') {
        setTimeout(() => {
          onLoginSuccess({ email, name: name || 'User' }, role, role === 'Operator' ? machineId : undefined);
          setIsLoading(false);
        }, 800);
      } 
      else if (mode === 'SIGNUP') {
        setTimeout(() => {
          onLoginSuccess({ email, name: name || 'User' }, role, role === 'Operator' ? machineId : undefined);
          setIsLoading(false);
        }, 800);
      }
      else if (mode === 'CONFIRM') {
        // await confirmSignUp({ username: email, confirmationCode: otp });
        setTimeout(() => {
          setMode('LOGIN');
          setIsLoading(false);
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-500 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={onToggleTheme}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center shadow-lg ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}
        >
          <span className={`absolute w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center text-xs ${isDark ? 'translate-x-6' : 'translate-x-0.5'}`}>
            {isDark ? '🌙' : '☀️'}
          </span>
        </button>
      </div>

      {/* Background Gradients */}
      {isDark && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      )}

      {/* Main Auth Card */}
      <div className={`relative z-10 w-full max-w-md border rounded-2xl p-8 shadow-2xl transition-all duration-500 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'}`}>
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg">DX</div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Manufacturing DX
          </h1>
          <p className="text-sm text-slate-500 mt-1">Command Center Authentication</p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode !== 'CONFIRM' && (
            <>
              <div>
                <label className={`block text-xs font-semibold uppercase mb-1 font-mono flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                <input
                  type="text" required
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-all outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase mb-1 font-mono flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="user@enterprise.com"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-all outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase mb-1 font-mono flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Lock className="w-3.5 h-3.5" /> Password
                </label>
                <input
                  type="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-all outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
                />
              </div>
            </>
          )}

          {mode === 'CONFIRM' && (
            <div>
              <label className={`block text-xs font-medium uppercase mb-1 font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Confirmation Code</label>
              <input
                type="text" required
                value={otp} onChange={e => setOtp(e.target.value)}
                className={`w-full border rounded-xl px-4 py-3 text-sm transition-all outline-none ${isDark ? 'bg-slate-950/80 border-slate-700/80 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
            </div>
          )}

          {mode === 'SIGNUP' && (
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className={`block text-xs font-medium uppercase mb-2 font-mono flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <User className="w-3.5 h-3.5" /> Select Role
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole('Admin')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${role === 'Admin' ? 'bg-blue-600 border-blue-600 text-white' : (isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-500 hover:bg-slate-100')}`}
                >Admin</button>
                <button
                  type="button"
                  onClick={() => setRole('Operator')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${role === 'Operator' ? 'bg-blue-600 border-blue-600 text-white' : (isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-500 hover:bg-slate-100')}`}
                >Operator</button>
              </div>

              {role === 'Operator' && (
                <div className="mt-3">
                  <label className="block text-xs font-medium uppercase mb-1 font-mono text-slate-400">Assigned Machine ID</label>
                  <input
                    type="text" required
                    value={machineId} onChange={e => setMachineId(e.target.value)}
                    placeholder="EDGE-NODE-001"
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-500 font-medium bg-rose-500/10 p-2 rounded border border-rose-500/20">{error}</p>
          )}

          <button
            type="submit" disabled={isLoading}
            className={`w-full font-semibold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-white bg-blue-600 hover:bg-blue-700`}
          >
            {isLoading ? "Processing..." : (mode === 'LOGIN' ? 'Secure Login' : mode === 'SIGNUP' ? 'Create Account' : 'Confirm Account')}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-xs">
          {mode === 'LOGIN' ? (
            <button type="button" onClick={() => { setMode('SIGNUP'); setError(null); }} className={`text-blue-500 hover:underline`}>
              New employee? Create an account.
            </button>
          ) : (
            <button type="button" onClick={() => { setMode('LOGIN'); setError(null); }} className={`text-blue-500 hover:underline`}>
              Already have an account? Login.
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
