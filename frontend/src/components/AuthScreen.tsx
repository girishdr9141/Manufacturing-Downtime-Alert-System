import React, { useState } from 'react';
import { ShieldCheck, Server, Lock, ArrowRight, Zap, CheckCircle2, Cpu, Globe, Moon, Sun } from 'lucide-react';

interface AuthScreenProps {
  onSaveUrl: (url: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSaveUrl, isDark, onToggleTheme }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let cleanUrl = inputUrl.trim();
    if (!cleanUrl) {
      setError('Please enter your AWS API Gateway Invoke URL.');
      return;
    }

    // Validation: Check protocol
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    if (!cleanUrl.startsWith('https://') && !cleanUrl.includes('localhost') && !cleanUrl.includes('demo')) {
      setError('Zero-Trust policy requires HTTPS protocol for API Gateway endpoints.');
      return;
    }

    // Strip trailing slash
    cleanUrl = cleanUrl.replace(/\/+$/, '');

    setIsLoading(true);
    setTimeout(() => {
      onSaveUrl(cleanUrl);
      setIsLoading(false);
    }, 400);
  };

  const handleUseDemo = () => {
    setIsLoading(true);
    setTimeout(() => {
      onSaveUrl('https://demo-api.dx-command-center.internal');
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-500 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={onToggleTheme}
          className={`p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 flex items-center justify-center ${isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-yellow-400' : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200'}`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Background Gradients & Effects */}
      {isDark ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-slate-200 opacity-80" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e130_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e130_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
        </>
      )}

      {/* Main Glassmorphic Auth Card */}
      <div className={`relative z-10 w-full max-w-lg border backdrop-blur-2xl rounded-2xl p-8 sm:p-10 shadow-2xl transition-all duration-500 ${isDark ? 'bg-slate-900/70 border-slate-800/80 shadow-cyan-950/20' : 'bg-white/80 border-slate-200/80 shadow-slate-300/50'}`}>
        
        {/* Header Badge & Title */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-medium mb-4 shadow-lg transition-colors duration-300 ${isDark ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400 shadow-cyan-950/50' : 'bg-blue-50 border-blue-200 text-blue-600 shadow-blue-500/10'}`}>
            <ShieldCheck className={`w-3.5 h-3.5 animate-pulse ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
            <span>Zero-Trust Gateway Verification</span>
          </div>

          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Enterprise DX <span className={`bg-clip-text text-transparent bg-gradient-to-r ${isDark ? 'from-cyan-400 to-indigo-400' : 'from-blue-600 to-indigo-600'}`}>Command Center</span>
          </h1>
          <p className={`text-xs sm:text-sm mt-2 max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Authenticate to your edge orchestration mesh. Input your AWS API Gateway Invoke URL to initialize telemetry and C2D controls.
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <Server className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-blue-500'}`} />
              AWS API Gateway Invoke URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setError(null);
                }}
                placeholder="https://xyz123.execute-api.us-east-1.amazonaws.com/prod"
                className={`w-full border focus:ring-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono transition-all duration-200 outline-none ${isDark ? 'bg-slate-950/80 border-slate-700/80 focus:border-cyan-500/80 focus:ring-cyan-500/20 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-900 placeholder-slate-400 shadow-inner'}`}
              />
              <Lock className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
            {error && (
              <p className="text-xs text-rose-500 mt-2 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm tracking-wide shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 text-white ${isDark ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'}`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Connect Gateway</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
          </div>
          <span className={`relative px-3 text-[11px] font-mono uppercase tracking-wider ${isDark ? 'bg-slate-900/90 text-slate-500' : 'bg-white text-slate-400'}`}>
            Quick Sandbox Options
          </span>
        </div>

        {/* Demo Gateway Preset */}
        <button
          type="button"
          onClick={handleUseDemo}
          className={`w-full border font-medium py-2.5 px-4 rounded-xl text-xs flex items-center justify-between transition-all duration-200 group cursor-pointer ${isDark ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg transition-colors ${isDark ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200'}`}>
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className={`block text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Load Demo API Gateway</span>
              <span className={`block text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>https://demo-api.dx-command-center.internal</span>
            </div>
          </div>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${isDark ? 'text-indigo-400 bg-indigo-950/80 border-indigo-500/30' : 'text-indigo-600 bg-indigo-50 border-indigo-200'}`}>
            Instant Demo
          </span>
        </button>

        {/* Security Features Footnote */}
        <div className={`mt-8 pt-6 border-t grid grid-cols-2 gap-3 text-[11px] font-mono ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
            <span>Double-JSON Decoder</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-500'}`} />
            <span>AWS C2D Protocol</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-blue-400' : 'text-indigo-500'}`} />
            <span>TLS 1.3 Transport</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
            <span>30s Auto Poll Active</span>
          </div>
        </div>

      </div>
    </div>
  );
};
