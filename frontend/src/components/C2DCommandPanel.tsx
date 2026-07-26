import React, { useState } from 'react';
import { Machine, C2DCommandLog } from '../types';
import { 
  Square, 
  Play, 
  UploadCloud, 
  Terminal, 
  Cpu, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  CheckCircle2, 
  XCircle,
  Radio
} from 'lucide-react';

interface C2DCommandPanelProps {
  machines: Machine[];
  selectedMachineId: string;
  onSelectMachine: (machineId: string) => void;
  onSendCommand: (machineId: string, command: 'START' | 'STOP' | 'PUSH_OTA', extraPayload?: any) => Promise<void>;
  commandLogs: C2DCommandLog[];
  isSending: boolean;
}

export const C2DCommandPanel: React.FC<C2DCommandPanelProps> = ({
  machines,
  selectedMachineId,
  onSelectMachine,
  onSendCommand,
  commandLogs,
  isSending,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPayloadJson, setCustomPayloadJson] = useState('{\n  "mode": "DIAGNOSTIC",\n  "force": true\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const currentMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  const handleExecuteCommand = async (command: 'START' | 'STOP' | 'PUSH_OTA') => {
    let parsedPayload: any = undefined;

    if (showAdvanced && customPayloadJson.trim()) {
      try {
        parsedPayload = JSON.parse(customPayloadJson);
        setJsonError(null);
      } catch (err: any) {
        setJsonError('Invalid JSON format in custom payload.');
        return;
      }
    }

    await onSendCommand(selectedMachineId, command, parsedPayload);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl flex flex-col h-full min-h-[460px] shadow-xl justify-between">
      
      {/* Panel Header */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white">Cloud-to-Device (C2D) Command Panel</h2>
              <p className="text-[11px] text-slate-400 font-mono">Zero-Trust encrypted edge dispatch</p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-cyan-500/30 text-[10px] font-mono text-cyan-400">
            MQTT / HTTPS Protocol
          </span>
        </div>

        {/* Machine Selector Dropdown & Tabs */}
        <div className="mb-4">
          <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Target Machine Node</span>
            <span className="text-[10px] text-slate-500">{currentMachine?.location}</span>
          </label>

          <div className="relative">
            <select
              value={selectedMachineId}
              onChange={(e) => onSelectMachine(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 text-cyan-300 font-mono text-xs font-bold rounded-xl px-3.5 py-2.5 appearance-none outline-none cursor-pointer"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                  {m.id} — {m.name} ({m.status})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Telemetry Status Bar for Selected Machine */}
        {currentMachine && (
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">STATUS</span>
              <span
                className={`font-bold ${
                  currentMachine.status === 'ERROR'
                    ? 'text-rose-400'
                    : currentMachine.status === 'WARNING'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {currentMachine.status}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">TEMP</span>
              <span className="text-white font-bold">{currentMachine.temperature}°C</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">FIRMWARE</span>
              <span className="text-slate-300 text-[11px]">{currentMachine.firmware}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">IP ADDR</span>
              <span className="text-slate-400 text-[11px] truncate block">{currentMachine.ip_address}</span>
            </div>
          </div>
        )}

        {/* Action Buttons Section (Strict PRD requirement) */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          
          {/* STOP Button (Red border/text) */}
          <button
            onClick={() => handleExecuteCommand('STOP')}
            disabled={isSending}
            className="bg-slate-950 hover:bg-rose-950/50 border-2 border-rose-500/60 hover:border-rose-400 text-rose-400 hover:text-rose-200 font-mono text-xs font-bold py-3 px-2 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-rose-950/20 group"
            title="Send POST {apiUrl}/commands with command: 'STOP'"
          >
            <Square className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform fill-rose-500/20" />
            <span>STOP</span>
          </button>

          {/* START Button (Emerald border/text) */}
          <button
            onClick={() => handleExecuteCommand('START')}
            disabled={isSending}
            className="bg-slate-950 hover:bg-emerald-950/50 border-2 border-emerald-500/60 hover:border-emerald-400 text-emerald-400 hover:text-emerald-200 font-mono text-xs font-bold py-3 px-2 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-950/20 group"
            title="Send POST {apiUrl}/commands with command: 'START'"
          >
            <Play className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform fill-emerald-500/20" />
            <span>START</span>
          </button>

          {/* Push OTA Button (Amber border/text) */}
          <button
            onClick={() => handleExecuteCommand('PUSH_OTA')}
            disabled={isSending}
            className="bg-slate-950 hover:bg-amber-950/50 border-2 border-amber-500/60 hover:border-amber-400 text-amber-400 hover:text-amber-200 font-mono text-xs font-bold py-3 px-2 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-amber-950/20 group"
            title="Send POST {apiUrl}/commands with command: 'PUSH_OTA'"
          >
            <UploadCloud className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Push OTA</span>
          </button>

        </div>

        {/* Advanced JSON Payload Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Sliders className="w-3 h-3" />
            <span>{showAdvanced ? 'Hide Custom Payload' : 'Configure Custom Payload Parameters'}</span>
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showAdvanced && (
            <div className="mt-2 animate-in fade-in duration-200">
              <textarea
                value={customPayloadJson}
                onChange={(e) => {
                  setCustomPayloadJson(e.target.value);
                  setJsonError(null);
                }}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-2.5 font-mono text-xs text-cyan-300 outline-none"
              />
              {jsonError && <p className="text-[10px] text-rose-400 font-mono mt-1">{jsonError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* C2D Execution Terminal / Log Console */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs mt-2">
        <div className="flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-800 pb-1.5 mb-2">
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-cyan-400" />
            C2D Execution Terminal Log
          </span>
          <span className="text-[9px] text-slate-600">POST /commands</span>
        </div>

        <div className="max-h-[100px] overflow-y-auto space-y-1.5 text-[11px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
          {commandLogs.length === 0 ? (
            <div className="text-slate-600 italic text-[11px]">No commands dispatched in current session.</div>
          ) : (
            commandLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-2 border-b border-slate-900 pb-1">
                <div>
                  <span className="text-slate-500 mr-1.5">[{log.timestamp}]</span>
                  <span className="font-bold text-cyan-400">{log.command}</span>
                  <span className="text-slate-400 ml-1.5">&rarr; {log.machine_id}</span>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
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
