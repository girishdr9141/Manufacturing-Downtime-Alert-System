import React, { useState } from 'react';
import { ShieldCheck, Server, Lock, ArrowRight, Zap, CheckCircle2, Cpu, Globe } from 'lucide-react';

interface AuthScreenProps {
  onSaveUrl: (url: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSaveUrl }) => {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Tech Grids & Ambient Glowing Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid line background overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"
      />

      {/* Main Glassmorphic Auth Card */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900/70 border border-slate-800/80 backdrop-blur-2xl rounded-2xl p-8 sm:p-10 shadow-2xl shadow-cyan-950/20">
        
        {/* Header Badge & Title */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium mb-4 shadow-lg shadow-cyan-950/50">
            <ShieldCheck className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>Zero-Trust Gateway Verification</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Enterprise DX <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Command Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm">
            Authenticate to your edge orchestration mesh. Input your AWS API Gateway Invoke URL to initialize telemetry and C2D controls.
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
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
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/20 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono transition-all duration-200 outline-none"
              />
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>
            {error && (
              <p className="text-xs text-rose-400 mt-2 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm tracking-wide shadow-lg shadow-cyan-500/25 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
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
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-slate-900/90 px-3 text-[11px] font-mono uppercase text-slate-500 tracking-wider">
            Quick Sandbox Options
          </span>
        </div>

        {/* Demo Gateway Preset */}
        <button
          type="button"
          onClick={handleUseDemo}
          className="w-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 font-medium py-2.5 px-4 rounded-xl text-xs flex items-center justify-between transition-all duration-200 group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-semibold text-white">Load Demo API Gateway</span>
              <span className="block text-[10px] text-slate-400 font-mono">https://demo-api.dx-command-center.internal</span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
            Instant Demo
          </span>
        </button>

        {/* Security Features Footnote */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Double-JSON Decoder</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>AWS C2D Protocol</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>TLS 1.3 Transport</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>30s Auto Poll Active</span>
          </div>
        </div>

      </div>
    </div>
  );
};
