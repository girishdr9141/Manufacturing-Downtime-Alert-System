import React, { useState } from 'react';
import { Machine, Ticket } from '../types';
import { Radio, ShieldAlert, Cpu, Activity, Thermometer, Zap, Layers, MapPin, ExternalLink } from 'lucide-react';

interface LiveFleetMapWidgetProps {
  machines: Machine[];
  tickets: Ticket[];
  selectedMachineId: string;
  onSelectMachine: (machineId: string) => void;
}

export const LiveFleetMapWidget: React.FC<LiveFleetMapWidgetProps> = ({
  machines,
  tickets,
  selectedMachineId,
  onSelectMachine,
}) => {
  const [hoveredMachine, setHoveredMachine] = useState<Machine | null>(null);

  // Helper to get machine status based on tickets data
  const getMachineCalculatedStatus = (machineId: string): 'ERROR' | 'WARNING' | 'HEALTHY' => {
    const openTickets = tickets.filter(
      (t) => t.machine_id === machineId && t.status === 'OPEN'
    );
    if (openTickets.some((t) => t.priority === 'P1' || t.priority === 'CRITICAL')) {
      return 'ERROR';
    }
    if (openTickets.length > 0) {
      return 'WARNING';
    }
    return 'HEALTHY';
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl relative flex flex-col justify-between h-full min-h-[380px] shadow-xl overflow-hidden group">
      
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-3 z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
              Live Edge Fleet Grid
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Spatial topology & machine node status
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
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

      {/* Map Stage Container */}
      <div className="relative flex-1 w-full bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden min-h-[280px]">
        
        {/* Map Grid Patterns */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#33415518_1px,transparent_1px),linear-gradient(to_bottom,#33415518_1px,transparent_1px)] bg-[size:2rem_2rem]" 
        />
        
        {/* Radar Sweep Animation Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.06)_0%,transparent_70%)] pointer-events-none" />
        
        {/* Lat/Long Crosshairs */}
        <div className="absolute top-2 left-3 font-mono text-[9px] text-slate-600 pointer-events-none select-none">
          LAT: 37.7749° N | LON: 122.4194° W | MESH: 0x8F4A
        </div>
        <div className="absolute bottom-2 right-3 font-mono text-[9px] text-slate-600 pointer-events-none select-none">
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
              {/* Outer Pulsing Ring */}
              <span className={`absolute -inset-2 rounded-full animate-ping opacity-75 ${pingColor}`} />

              {/* Main Node Pin Dot */}
              <div
                className={`relative w-4 h-4 rounded-full border-2 transition-all duration-300 ${pinColor} ${
                  isSelected ? 'scale-125 ring-4 ring-cyan-500/50' : 'hover:scale-125'
                }`}
              />

              {/* Permanent Machine Label Badge */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 top-5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold tracking-tight whitespace-nowrap shadow-lg border transition-all duration-200 ${
                  isSelected
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                    : 'bg-slate-900/90 border-slate-700/80 text-slate-300 group-hover/pin:border-slate-500'
                }`}
              >
                {machine.id}
              </div>
            </div>
          );
        })}

        {/* Floating Telemetry HUD Hover Card */}
        {hoveredMachine && (
          <div className="absolute bottom-4 left-4 z-30 bg-slate-900/95 border border-slate-700/80 backdrop-blur-2xl p-3.5 rounded-xl shadow-2xl max-w-xs w-full font-mono text-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="font-bold text-white tracking-tight flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {hoveredMachine.id}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  getMachineCalculatedStatus(hoveredMachine.id) === 'ERROR'
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                    : getMachineCalculatedStatus(hoveredMachine.id) === 'WARNING'
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {getMachineCalculatedStatus(hoveredMachine.id)}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-2 truncate">{hoveredMachine.location}</p>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <span className="text-[9px] text-slate-500 block">TEMP</span>
                  <span className="font-bold text-white">{hoveredMachine.temperature}°C</span>
                </div>
              </div>

              <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <div>
                  <span className="text-[9px] text-slate-500 block">VIBRATION</span>
                  <span className="font-bold text-white">{hoveredMachine.vibration} mm/s</span>
                </div>
              </div>
            </div>

            <div className="mt-2 text.center text-[10px] text-cyan-400 font-sans flex items-center justify-end gap-1">
              Click node to load C2D panel <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        )}

      </div>

      {/* Selected Node Quick Info Footer Bar */}
      <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">SELECTED NODE:</span>
          <span className="text-cyan-400 font-bold">{selectedMachineId}</span>
        </div>
        <button
          onClick={() => onSelectMachine(selectedMachineId)}
          className="text-slate-400 hover:text-white text-[11px] underline underline-offset-2 transition-colors"
        >
          Dispatch C2D Command &rarr;
        </button>
      </div>

    </div>
  );
};
