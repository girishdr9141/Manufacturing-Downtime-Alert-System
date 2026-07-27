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
        // SIMULATED COGNITO LOGIN (Replace with actual Amplify signIn later)
        // const { isSignedIn } = await signIn({ username: email, password });
        setTimeout(() => {
          onLoginSuccess({ email }, role, role === 'Operator' ? machineId : undefined);
          setIsLoading(false);
        }, 1000);
      } 
      else if (mode === 'SIGNUP') {
        setTimeout(() => {
          onLoginSuccess({ email }, role, role === 'Operator' ? machineId : undefined);
          setIsLoading(false);
        }, 1000);
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
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-500 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={onToggleTheme}
          className={`p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 flex items-center justify-center ${isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-yellow-400' : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200'}`}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Background Gradients */}
      {isDark ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-slate-200 opacity-80" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
        </>
      )}

      {/* Main Glassmorphic Auth Card */}
      <div className={`relative z-10 w-full max-w-md border backdrop-blur-2xl rounded-2xl p-8 shadow-2xl transition-all duration-500 ${isDark ? 'bg-slate-900/70 border-slate-800/80 shadow-cyan-950/20' : 'bg-white/80 border-slate-200/80 shadow-slate-300/50'}`}>
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-medium mb-4 shadow-lg ${isDark ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
            <ShieldCheck className={`w-3.5 h-3.5 animate-pulse ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
            <span>Strict Authenticated Access</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Enterprise DX Login
          </h1>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode !== 'CONFIRM' && (
            <>
              <div>
                <label className={`block text-xs font-medium uppercase mb-1 font-mono flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm transition-all outline-none ${isDark ? 'bg-slate-950/80 border-slate-700/80 text-white focus:border-cyan-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase mb-1 font-mono flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <Lock className="w-3.5 h-3.5" /> Password
                </label>
                <input
                  type="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm transition-all outline-none ${isDark ? 'bg-slate-950/80 border-slate-700/80 text-white focus:border-cyan-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
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
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${role === 'Admin' ? (isDark ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-blue-100 border-blue-500 text-blue-700') : (isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500')}`}
                >Admin</button>
                <button
                  type="button"
                  onClick={() => setRole('Operator')}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${role === 'Operator' ? (isDark ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-blue-100 border-blue-500 text-blue-700') : (isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500')}`}
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
            className={`w-full font-semibold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-white ${isDark ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
          >
            {isLoading ? "Processing..." : (mode === 'LOGIN' ? 'Secure Login' : mode === 'SIGNUP' ? 'Create Account' : 'Confirm Account')}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-xs">
          {mode === 'LOGIN' ? (
            <button type="button" onClick={() => { setMode('SIGNUP'); setError(null); }} className={`${isDark ? 'text-cyan-400' : 'text-blue-600'} hover:underline`}>
              New employee? Create an account.
            </button>
          ) : (
            <button type="button" onClick={() => { setMode('LOGIN'); setError(null); }} className={`${isDark ? 'text-cyan-400' : 'text-blue-600'} hover:underline`}>
              Already have an account? Login.
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
