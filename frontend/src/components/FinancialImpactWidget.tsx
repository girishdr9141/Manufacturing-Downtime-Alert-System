import React, { useEffect, useState } from 'react';
import { Ticket } from '../types';
import { useI18n } from '../i18n';
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

interface FinancialImpactWidgetProps {
  tickets: Ticket[];
  isDark: boolean;
}

// Realistic cost for a single manufacturing node in JP/IN: ~$3.50 USD / min
// Conversions: 1 USD = 150 JPY, 1 USD = 83 INR
const COST_PER_MIN_USD = 3.50;
const USD_TO_JPY = 150;
const USD_TO_INR = 83;

export const FinancialImpactWidget: React.FC<FinancialImpactWidgetProps> = ({ tickets, isDark }) => {
  const { t } = useI18n();
  const [liveLost, setLiveLost] = useState({ usd: 0, jpy: 0, inr: 0 });
  const [liveSaved, setLiveSaved] = useState({ usd: 0, jpy: 0, inr: 0 });

  useEffect(() => {
    const calculate = () => {
      let lostUsd = 0;
      let savedUsd = 0;

      tickets.forEach(ticket => {
        const createdTime = new Date(ticket.created_at).getTime();

        if (ticket.status === 'OPEN') {
          const now = Date.now();
          const downMinutes = (now - createdTime) / 1000 / 60;
          lostUsd += downMinutes * COST_PER_MIN_USD;
        } else if (ticket.status === 'RESOLVED' && ticket.resolved_at) {
          const resolvedTime = new Date(ticket.resolved_at).getTime();
          let downMinutes = (resolvedTime - createdTime) / 1000 / 60;
          
          if (downMinutes > 1440) downMinutes = 15;

          lostUsd += downMinutes * COST_PER_MIN_USD;

          if (downMinutes < 45) {
            const savedMinutes = 45 - downMinutes;
            savedUsd += savedMinutes * COST_PER_MIN_USD;
          }
        }
      });

      setLiveLost({
        usd: lostUsd,
        jpy: lostUsd * USD_TO_JPY,
        inr: lostUsd * USD_TO_INR
      });

      setLiveSaved({
        usd: savedUsd,
        jpy: savedUsd * USD_TO_JPY,
        inr: savedUsd * USD_TO_INR
      });
    };

    // Run immediately so the UI updates instantly when a ticket is resolved
    calculate();

    // Then run every second for the live ticker effect
    const interval = setInterval(calculate, 1000);

    return () => clearInterval(interval);
  }, [tickets]);

  const formatCurrency = (val: number, symbol: string) => {
    return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className={`p-5 flex flex-col gap-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-5 h-5 text-emerald-500" />
        <h2 className="text-lg font-bold">{t('financialImpact')}</h2>
        <span className={`text-xs ml-auto font-mono px-2 py-1 rounded border ${isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
          {t('costPerMin')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue Lost */}
        <div className={`p-5 rounded-xl border flex flex-col items-center justify-center relative overflow-hidden ${isDark ? 'bg-slate-900/50 border-rose-900/50' : 'bg-rose-50 border-rose-100'}`}>
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <TrendingDown className="w-16 h-16 text-rose-500" />
          </div>
          <p className={`text-sm font-bold uppercase tracking-wider mb-2 z-10 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{t('liveRevenueLost')}</p>
          
          <div className="flex flex-col items-center gap-1 z-10 font-mono">
            <span className={`text-3xl font-black ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
              {formatCurrency(liveLost.jpy, '¥')}
            </span>
            <span className={`text-xl font-bold ${isDark ? 'text-rose-400/80' : 'text-rose-500/80'}`}>
              {formatCurrency(liveLost.inr, '₹')}
            </span>
          </div>
        </div>

        {/* Revenue Saved */}
        <div className={`p-5 rounded-xl border flex flex-col items-center justify-center relative overflow-hidden ${isDark ? 'bg-slate-900/50 border-emerald-900/50' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <TrendingUp className="w-16 h-16 text-emerald-500" />
          </div>
          <p className={`text-sm font-bold uppercase tracking-wider mb-2 z-10 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('revenueSaved')}</p>
          
          <div className="flex flex-col items-center gap-1 z-10 font-mono">
            <span className={`text-3xl font-black ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
              {formatCurrency(liveSaved.jpy, '¥')}
            </span>
            <span className={`text-xl font-bold ${isDark ? 'text-emerald-400/80' : 'text-emerald-500/80'}`}>
              {formatCurrency(liveSaved.inr, '₹')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
