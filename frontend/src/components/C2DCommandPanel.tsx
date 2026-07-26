import React, { useState } from 'react';
import { Machine, C2DCommandLog } from '../types';
import { Square, Play, UploadCloud, Terminal, Sliders, ChevronDown, ChevronUp, Zap, CheckCircle2 } from 'lucide-react';

interface C2DCommandPanelProps {
  machines: Machine[];
  selectedMachineId: string;
  onSelectMachine: (machineId: string) => void;
  onSendCommand: (machineId: string, command: 'START' | 'STOP' | 'PUSH_OTA', extraPayload?: any) => Promise<void>;
  commandLogs: C2DCommandLog[];
  isSending: boolean;
  isDark?: boolean;
}

export const C2DCommandPanel: React.FC<C2DCommandPanelProps> = ({
  machines, selectedMachineId, onSelectMachine, onSendCommand, commandLogs, isSending, isDark = true,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPayloadJson, setCustomPayloadJson] = useState('{\n  "mode": "DIAGNOSTIC",\n  "force": true\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const currentMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  const handleExecuteCommand = async (command: 'START' | 'STOP' | 'PUSH_OTA') => {
    let parsedPayload: any = undefined;
    if (showAdvanced && customPayloadJson.trim()) {
      try { parsedPayload = JSON.parse(customPayloadJson); setJsonError(null); }
      catch (err: any) { setJsonError('Invalid JSON format in custom payload.'); return; }
    }
    await onSendCommand(selectedMachineId, command, parsedPayload);
  };

  // Theme helpers
  const card = isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-200 shadow-md';
  const headerBorder = isDark ? 'border-slate-800' : 'border-slate-200';
  const headerTitle = isDark ? 'text-white' : 'text-slate-900';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const protocolBadge = isDark ? 'bg-slate-900 border-cyan-500/30 text-cyan-400' : 'bg-cyan-50 border-cyan-300 text-cyan-600';
  const labelText = isDark ? 'text-slate-400' : 'text-slate-600';
  const locationText = isDark ? 'text-slate-500' : 'text-slate-400';
  const select = isDark ? 'bg-slate-950 border-slate-800 focus:border-cyan-500/80 text-cyan-300' : 'bg-slate-50 border-slate-300 focus:border-cyan-400 text-cyan-700';
  const telemetryBar = isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-100 border-slate-200';
  const telemetryLabel = isDark ? 'text-slate-500' : 'text-slate-400';
  const telemetryValue = isDark ? 'text-white' : 'text-slate-900';
  const advancedToggle = isDark ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-500 hover:text-cyan-600';
  const textarea = isDark ? 'bg-slate-950 border-slate-800 focus:border-cyan-500 text-cyan-300' : 'bg-slate-50 border-slate-300 focus:border-cyan-400 text-cyan-700';
  const terminal = isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200';
  const terminalHeader = isDark ? 'text-slate-500 border-slate-800' : 'text-slate-400 border-slate-200';
  const logEntry = isDark ? 'border-slate-900' : 'border-slate-200';
  const logTime = isDark ? 'text-slate-500' : 'text-slate-400';
  const logMachine = isDark ? 'text-slate-400' : 'text-slate-600';
  const noLogs = isDark ? 'text-slate-600' : 'text-slate-400';

  return (
    <div className={`border rounded-2xl p-5 flex flex-col h-full min-h-[460px] transition-colors duration-300 justify-between ${card}`}>

      <div>
        {/* Header */}
        <div className={`flex items-center justify-between mb-4 border-b pb-3 ${headerBorder}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isDark ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400' : 'bg-cyan-100 border-cyan-300 text-cyan-600'}`}>
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className={`text-sm font-semibold tracking-tight ${headerTitle}`}>Cloud-to-Device (C2D) Command Panel</h2>
              <p className={`text-[11px] font-mono ${subText}`}>Zero-Trust encrypted edge dispatch</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${protocolBadge}`}>MQTT / HTTPS</span>
        </div>

        {/* Machine Selector */}
        <div className="mb-4">
          <label className={`block text-[11px] font-mono uppercase mb-1.5 flex items-center justify-between ${labelText}`}>
            <span>Target Machine Node</span>
            <span className={`text-[10px] ${locationText}`}>{currentMachine?.location}</span>
          </label>
          <div className="relative">
            <select value={selectedMachineId} onChange={(e) => onSelectMachine(e.target.value)}
              className={`w-full border font-mono text-xs font-bold rounded-xl px-3.5 py-2.5 appearance-none outline-none cursor-pointer transition-colors ${select}`}>
              {machines.map((m) => (
                <option key={m.id} value={m.id} className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                  {m.id} — {m.name} ({m.status})
                </option>
              ))}
            </select>
            <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
        </div>

        {/* Telemetry Status Bar */}
        {currentMachine && (
          <div className={`border rounded-xl p-3 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs transition-colors ${telemetryBar}`}>
            <div>
              <span className={`text-[10px] block ${telemetryLabel}`}>STATUS</span>
              <span className={`font-bold ${currentMachine.status === 'ERROR' ? 'text-rose-400' : currentMachine.status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {currentMachine.status}
              </span>
            </div>
            <div>
              <span className={`text-[10px] block ${telemetryLabel}`}>TEMP</span>
              <span className={`font-bold ${telemetryValue}`}>{currentMachine.temperature}°C</span>
            </div>
            <div>
              <span className={`text-[10px] block ${telemetryLabel}`}>FIRMWARE</span>
              <span className={isDark ? 'text-slate-300 text-[11px]' : 'text-slate-600 text-[11px]'}>{currentMachine.firmware}</span>
            </div>
            <div>
              <span className={`text-[10px] block ${telemetryLabel}`}>IP ADDR</span>
              <span className={`text-[11px] truncate block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{currentMachine.ip_address}</span>
            </div>
          </div>
        )}

        {/* Command Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => handleExecuteCommand('STOP')} disabled={isSending}
            className={`border-2 font-mono text-xs font-bold py-3 px-2 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 group ${isDark ? 'bg-slate-950 hover:bg-rose-950/50 border-rose-500/60 hover:border-rose-400 text-rose-400 hover:text-rose-200' : 'bg-rose-50 hover:bg-rose-100 border-rose-400 text-rose-600 hover:text-rose-800'}`}>
            <Square className="w-4 h-4 group-hover:scale-110 transition-transform fill-rose-500/20" />
            <span>STOP</span>
          </button>

          <button onClick={() => handleExecuteCommand('START')} disabled={isSending}
            className={`border-2 font-mono text-xs font-bold py-3 px-2 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 group ${isDark ? 'bg-slate-950 hover:bg-emerald-950/50 border-emerald-500/60 hover:border-emerald-400 text-emerald-400 hover:text-emerald-200' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400 text-emerald-600 hover:text-emerald-800'}`}>
            <Play className="w-4 h-4 group-hover:scale-110 transition-transform fill-emerald-500/20" />
            <span>START</span>
          </button>

          <button onClick={() => handleExecuteCommand('PUSH_OTA')} disabled={isSending}
            className={`border-2 font-mono text-xs font-bold py-3 px-2 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 group ${isDark ? 'bg-slate-950 hover:bg-amber-950/50 border-amber-500/60 hover:border-amber-400 text-amber-400 hover:text-amber-200' : 'bg-amber-50 hover:bg-amber-100 border-amber-400 text-amber-600 hover:text-amber-800'}`}>
            <UploadCloud className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Push OTA</span>
          </button>
        </div>

        {/* Advanced JSON Toggle */}
        <div className="mb-4">
          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className={`text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${advancedToggle}`}>
            <Sliders className="w-3 h-3" />
            <span>{showAdvanced ? 'Hide Custom Payload' : 'Configure Custom Payload Parameters'}</span>
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showAdvanced && (
            <div className="mt-2">
              <textarea value={customPayloadJson} onChange={(e) => { setCustomPayloadJson(e.target.value); setJsonError(null); }}
                rows={3} className={`w-full border rounded-xl p-2.5 font-mono text-xs outline-none transition-colors ${textarea}`} />
              {jsonError && <p className="text-[10px] text-rose-400 font-mono mt-1">{jsonError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Terminal Log */}
      <div className={`border rounded-xl p-3 font-mono text-xs transition-colors ${terminal}`}>
        <div className={`flex items-center justify-between text-[10px] border-b pb-1.5 mb-2 ${terminalHeader}`}>
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-cyan-500" />
            C2D Execution Terminal Log
          </span>
          <span className={`text-[9px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>POST /commands</span>
        </div>
        <div className="max-h-[100px] overflow-y-auto space-y-1.5 text-[11px] pr-1">
          {commandLogs.length === 0 ? (
            <div className={`italic text-[11px] ${noLogs}`}>No commands dispatched in current session.</div>
          ) : (
            commandLogs.map((log) => (
              <div key={log.id} className={`flex items-start justify-between gap-2 border-b pb-1 ${logEntry}`}>
                <div>
                  <span className={`mr-1.5 ${logTime}`}>[{log.timestamp}]</span>
                  <span className="font-bold text-cyan-500">{log.command}</span>
                  <span className={`ml-1.5 ${logMachine}`}>&rarr; {log.machine_id}</span>
                </div>
                <div className="shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDark ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/30' : 'text-emerald-600 bg-emerald-50 border-emerald-300'}`}>
                    200 OK
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
