import React, { useState } from 'react';
import { Machine, Ticket } from '../types';
import { Radio, Activity, Thermometer, ExternalLink, MapPin } from 'lucide-react';

interface LiveFleetMapWidgetProps {
  machines: Machine[];
  tickets: Ticket[];
  selectedMachineId: string;
  onSelectMachine: (machineId: string) => void;
  isDark?: boolean;
}

export const LiveFleetMapWidget: React.FC<LiveFleetMapWidgetProps> = ({
  machines,
  tickets,
  selectedMachineId,
  onSelectMachine,
  isDark = true,
}) => {
  const [hoveredMachine, setHoveredMachine] = useState<Machine | null>(null);

  const getMachineCalculatedStatus = (machineId: string): 'ERROR' | 'WARNING' | 'HEALTHY' => {
    const openTickets = tickets.filter(
      (t) => t.machine_id === machineId && t.status === 'OPEN'
    );
    if (openTickets.some((t) => t.priority === 'P1' || t.priority === 'CRITICAL')) return 'ERROR';
    if (openTickets.length > 0) return 'WARNING';

    const machine = machines.find(m => m.id === machineId);
    if (machine) {
      if (machine.status.includes('CRITICAL') || machine.status.includes('ERROR')) return 'ERROR';
      if (machine.status.includes('WARNING')) return 'WARNING';
    }
    
    return 'HEALTHY';
  };

  // Theme-aware class helpers
  const card = isDark
    ? 'bg-slate-900 border-slate-700/80'
    : 'bg-white border-slate-200 shadow-md';

  const headerText = isDark ? 'text-white' : 'text-slate-900';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';

  const legendBg = isDark
    ? 'bg-slate-800/80 border-slate-700 text-slate-400'
    : 'bg-slate-100 border-slate-300 text-slate-600';

  const mapBg = isDark
    ? 'bg-slate-950'
    : 'bg-slate-50 border-slate-200';

  const gridPattern = isDark
    ? 'bg-[linear-gradient(to_right,#33415530_1px,transparent_1px),linear-gradient(to_bottom,#33415530_1px,transparent_1px)]'
    : 'bg-[linear-gradient(to_right,#cbd5e130_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e130_1px,transparent_1px)]';

  const coordText = isDark ? 'text-slate-600' : 'text-slate-400';

  const hudBg = isDark
    ? 'bg-slate-900/95 border-slate-700/80 text-slate-300'
    : 'bg-white/95 border-slate-300 text-slate-700 shadow-xl';

  const hudInner = isDark
    ? 'bg-slate-950 border-slate-800'
    : 'bg-slate-100 border-slate-200';

  const footerBg = isDark
    ? 'bg-slate-950/80 border-slate-800 text-slate-400'
    : 'bg-slate-100 border-slate-200 text-slate-500';

  const labelSelected = isDark
    ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
    : 'bg-cyan-50 border-cyan-500 text-cyan-700';

  const labelDefault = isDark
    ? 'bg-slate-900/90 border-slate-700/80 text-slate-300'
    : 'bg-white border-slate-300 text-slate-700';

  return (
    <div className={`border rounded-2xl p-5 relative flex flex-col justify-between h-full min-h-[380px] overflow-hidden transition-colors duration-300 ${card}`}>

      {/* Widget Header */}
      <div className="flex items-center justify-between mb-3 z-10">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400' : 'bg-cyan-100 border-cyan-300 text-cyan-600'}`}>
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className={`text-sm font-semibold tracking-tight ${headerText}`}>
              Live Edge Fleet Grid
            </h2>
            <p className={`text-[11px] font-mono ${subText}`}>
              Spatial topology &amp; machine node status
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className={`flex items-center gap-3 text-[11px] font-mono px-2.5 py-1 rounded-lg border ${legendBg}`}>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Healthy</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <span>Error</span>
          </div>
        </div>
      </div>

      {/* Map Stage */}
      <div className={`relative flex-1 w-full rounded-xl border overflow-hidden min-h-[280px] transition-colors duration-300 ${mapBg}`}>

        {/* Grid Pattern */}
        <div className={`absolute inset-0 ${gridPattern} bg-[size:2rem_2rem]`} />

        {/* Radial Glow */}
        <div className={`absolute inset-0 pointer-events-none ${
          isDark
            ? 'bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.06)_0%,transparent_70%)]'
            : 'bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.04)_0%,transparent_70%)]'
        }`} />

        {/* Coordinates */}
        <div className={`absolute top-2 left-3 font-mono text-[9px] pointer-events-none select-none ${coordText}`}>
          LAT: 37.7749° N | LON: 122.4194° W | MESH: 0x8F4A
        </div>
        <div className={`absolute bottom-2 right-3 font-mono text-[9px] pointer-events-none select-none ${coordText}`}>
          TOPOLOGY: DISTRIBUTED C2D | SCAN: ACTIVE (30s)
        </div>

        {/* Machine Pins */}
        {machines.map((machine) => {
          const calcStatus = getMachineCalculatedStatus(machine.id);
          const isSelected = selectedMachineId === machine.id;
          const isError = calcStatus === 'ERROR';
          const isWarning = calcStatus === 'WARNING';

          const pinColor = isError
            ? 'bg-rose-500 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.9)]'
            : isWarning
            ? 'bg-amber-400 border-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.9)]'
            : 'bg-emerald-400 border-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.9)]';

          const pingColor = isError
            ? 'bg-rose-500/60'
            : isWarning
            ? 'bg-amber-400/60'
            : 'bg-emerald-400/60';

          return (
            <div
              key={machine.id}
              style={{ left: `${machine.x}%`, top: `${machine.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group/pin"
              onClick={() => onSelectMachine(machine.id)}
              onMouseEnter={() => setHoveredMachine(machine)}
              onMouseLeave={() => setHoveredMachine(null)}
            >
              <span className={`absolute -inset-2 rounded-full animate-ping opacity-75 ${pingColor}`} />
              <div
                className={`relative w-4 h-4 rounded-full border-2 transition-all duration-300 ${pinColor} ${
                  isSelected ? 'scale-125 ring-4 ring-cyan-500/50' : 'hover:scale-125'
                }`}
              />
              <div
                className={`absolute left-1/2 -translate-x-1/2 top-5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold tracking-tight whitespace-nowrap shadow-lg border transition-all duration-200 ${
                  isSelected ? labelSelected : labelDefault
                }`}
              >
                {machine.id}
              </div>
            </div>
          );
        })}

        {/* Hover Telemetry Card */}
        {hoveredMachine && (
          <div className={`absolute bottom-4 left-4 z-30 backdrop-blur-2xl p-3.5 rounded-xl shadow-2xl max-w-xs w-full font-mono text-xs border ${hudBg}`}>
            <div className={`flex items-center justify-between border-b pb-2 mb-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <span className={`font-bold tracking-tight flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                {hoveredMachine.id}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                getMachineCalculatedStatus(hoveredMachine.id) === 'ERROR'
                  ? isDark ? 'bg-rose-950 text-rose-300 border border-rose-500/30' : 'bg-rose-100 text-rose-700 border border-rose-300'
                  : getMachineCalculatedStatus(hoveredMachine.id) === 'WARNING'
                  ? isDark ? 'bg-amber-950 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-300'
                  : isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              }`}>
                {getMachineCalculatedStatus(hoveredMachine.id)}
              </span>
            </div>

            <p className={`text-[11px] mb-2 truncate ${subText}`}>{hoveredMachine.location}</p>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className={`p-2 rounded border flex items-center gap-1.5 ${hudInner}`}>
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <span className={`text-[9px] block ${coordText}`}>TEMP</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{hoveredMachine.temperature}°C</span>
                </div>
              </div>
              <div className={`p-2 rounded border flex items-center gap-1.5 ${hudInner}`}>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <div>
                  <span className={`text-[9px] block ${coordText}`}>VIBRATION</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{hoveredMachine.vibration} mm/s</span>
                </div>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-cyan-500 font-sans flex items-center justify-end gap-1">
              Click node to load C2D panel <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <div className={`mt-3 border rounded-xl p-2.5 flex items-center justify-between text-xs font-mono transition-colors duration-300 ${footerBg}`}>
        <div className="flex items-center gap-2">
          <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>SELECTED NODE:</span>
          <span className="text-cyan-500 font-bold">{selectedMachineId}</span>
        </div>
        <button
          onClick={() => onSelectMachine(selectedMachineId)}
          className="text-cyan-500 hover:text-cyan-400 text-[11px] underline underline-offset-2 transition-colors"
        >
          Dispatch C2D Command &rarr;
        </button>
      </div>
    </div>
  );
};
