import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TelemetryPoint } from '../types';
import { useI18n } from '../i18n';
import { BrainCircuit, AlertTriangle } from 'lucide-react';

interface Props {
  data: TelemetryPoint[];
  isDark: boolean;
}

export const PredictiveMaintenanceWidget: React.FC<Props> = ({ data, isDark }) => {
  const { t } = useI18n();

  const currentRisk = data.length > 0 ? data[data.length - 1].riskScore : 0;
  
  let riskStatus = 'HEALTHY';
  let riskColor = 'text-emerald-500';
  let bgGlow = 'bg-emerald-500/10';
  let strokeColor = '#10b981';

  if (currentRisk > 75) {
    riskStatus = 'CRITICAL';
    riskColor = 'text-rose-500';
    bgGlow = 'bg-rose-500/10';
    strokeColor = '#f43f5e';
  } else if (currentRisk > 40) {
    riskStatus = 'WARNING';
    riskColor = 'text-amber-500';
    bgGlow = 'bg-amber-500/10';
    strokeColor = '#f59e0b';
  }

  const tooltipStyle = isDark
    ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc', fontSize: '12px' }
    : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px' };

  return (
    <div className={`p-5 rounded-2xl border transition-colors duration-500 flex flex-col gap-4 ${isDark ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-purple-500" />
          <h2 className="text-sm font-bold tracking-tight uppercase">{t('aiPredictiveEngine')}</h2>
        </div>
        <div className={`px-3 py-1 rounded-full border text-xs font-bold font-mono flex items-center gap-2 ${bgGlow} ${riskColor} ${isDark ? 'border-current/20' : 'border-current/30'}`}>
          {currentRisk > 75 && <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />}
          {t('failureProbability')}: {currentRisk}%
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[200px] relative mt-2">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-mono opacity-50">
            {t('awaitingTelemetry')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
              <XAxis dataKey="timestamp" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} tickMargin={10} minTickGap={20} />
              <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="riskScore" stroke={strokeColor} strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" name="Risk %" animationDuration={300} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {currentRisk > 75 && (
        <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-500 font-medium">
            <strong>{t('aiWarning')}:</strong> {t('aiWarningDesc')}
          </p>
        </div>
      )}
    </div>
  );
};
