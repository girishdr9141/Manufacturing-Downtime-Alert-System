import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Download, 
  LogOut, 
  RefreshCw, 
  Globe, 
  Copy, 
  Check, 
  Radio, 
  Layers
} from 'lucide-react';

interface HeaderProps {
  apiUrl: string;
  onLogout: () => void;
  onRefreshTickets: () => void;
  isRefreshing?: boolean;
  isDemo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  apiUrl,
  onLogout,
  onRefreshTickets,
  isRefreshing = false,
  isDemo = false,
}) => {
  const [copied, setCopied] = useState(false);

  // Truncate URL for display
  const displayUrl =
    apiUrl.length > 40 ? `${apiUrl.substring(0, 22)}...${apiUrl.substring(apiUrl.length - 12)}` : apiUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const exportUrl = `${apiUrl.replace(/\/+$/, '')}/export`;
    
    if (isDemo) {
      // Create synthesized CSV download for demo preview
      const csvContent = [
        ['Ticket ID', 'Machine ID', 'Priority', 'Status', 'Description', 'Created At'],
        ['TCK-8841', 'PLASMA-GEN-001', 'P1', 'OPEN', 'Thermal runaway threshold breached (>85°C)', new Date().toISOString()],
        ['TCK-8839', 'PLASMA-GEN-002', 'P2', 'OPEN', 'Elevated harmonic vibration (4.1 mm/s)', new Date().toISOString()],
        ['TCK-8812', 'PLASMA-GEN-003', 'P4', 'RESOLVED', 'Routine telemetry diagnostic notice', new Date().toISOString()],
      ]
        .map((e) => e.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `dx_command_center_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Standard PRD requirement: window.open(apiUrl + '/export')
    window.open(exportUrl, '_blank');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-xl px-4 sm:px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Brand & Status Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-950/50">
            <Layers className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-sans">
                Enterprise DX <span className="text-cyan-400">Command Center</span>
              </h1>
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-mono font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Zero-Trust Active
              </div>
            </div>

            {/* Truncated Gateway URL Display */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate max-w-[200px] sm:max-w-[320px]" title={apiUrl}>
                {displayUrl}
              </span>
              <button
                onClick={handleCopy}
                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                title="Copy API Gateway URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {isDemo && (
                <span className="px-1.5 py-0.2 bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] rounded uppercase font-sans">
                  Demo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Manual Refresh Button */}
          <button
            onClick={onRefreshTickets}
            disabled={isRefreshing}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
            title="Refresh active tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export CSV Button (PRD Requirement) */}
          <button
            onClick={handleExportCSV}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 shadow-sm cursor-pointer"
            title="Trigger GET {apiUrl}/export"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          {/* Logout / Clear URL Button */}
          <button
            onClick={onLogout}
            className="bg-slate-900 hover:bg-rose-950/40 border border-slate-700/80 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer"
            title="Disconnect Gateway URL & Clear State"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400" />
            <span>Disconnect</span>
          </button>
        </div>

      </div>
    </header>
  );
};
