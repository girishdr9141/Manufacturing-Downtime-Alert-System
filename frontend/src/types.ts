export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Ticket {
  ticket_id: string;
  machine_id: string;
  priority: TicketPriority;
  description: string;
  ai_runbook: string;
  status: TicketStatus;
  created_at: string;
  updated_at?: string;
  telemetry_snapshot?: {
    temperature: number;
    vibration: number;
    power_kw: number;
    rpm: number;
  };
  dispatched_expert?: string;
  dispatched_notes?: string;
}

export type MachineStatus = 'HEALTHY' | 'ERROR' | 'WARNING';

export interface Machine {
  id: string;
  name: string;
  location: string;
  x: number; // Percentage coordinate for grid map (0-100)
  y: number; // Percentage coordinate for grid map (0-100)
  status: MachineStatus;
  temperature: number; // in °C
  vibration: number; // in mm/s
  power_kw: number;
  rpm: number;
  firmware: string;
  lastPing: string;
  ip_address: string;
}

export interface C2DCommandLog {
  id: string;
  machine_id: string;
  command: 'START' | 'STOP' | 'PUSH_OTA' | string;
  payload?: Record<string, any>;
  timestamp: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  httpStatus?: number;
  responseData?: any;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp?: string;
}
