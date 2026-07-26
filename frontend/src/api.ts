import { INITIAL_TICKETS } from './mockData';
import { Ticket, C2DCommandLog } from './types';

// In-memory simulation state for demo mode / offline fallback
let demoTicketsState: Ticket[] = [...INITIAL_TICKETS];
let demoCommandLogs: C2DCommandLog[] = [];

/**
 * Safely parses API Gateway payload which may be double-stringified JSON.
 * Example AWS Lambda proxy integration output:
 * { statusCode: 200, body: "{\"tickets\":[...]}" }
 * or raw JSON string: "\"[{\\\"ticket_id\\\": \\\"123\\\"}]\""
 */
export function parseApiGatewayResponse(data: any): any {
  let result = data;

  // If response is a string, try parsing it
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result);
    } catch {
      return result;
    }
  }

  // If object has a `body` property that is a stringified JSON (AWS Lambda Proxy standard)
  if (result && typeof result === 'object' && 'body' in result) {
    if (typeof result.body === 'string') {
      try {
        result = JSON.parse(result.body);
      } catch {
        result = result.body;
      }
    } else if (result.body) {
      result = result.body;
    }
  }

  // Handle second layer of stringification if present
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result);
    } catch {
      // Return as is
    }
  }

  return result;
}

export function isDemoUrl(url: string): boolean {
  if (!url) return true;
  const clean = url.trim().toLowerCase();
  return (
    clean.includes('demo') ||
    clean.includes('internal') ||
    clean === 'https://demo-api.dx-command-center.internal'
  );
}

/**
 * Core fetch API wrapper with double-stringified JSON decoding and demo fallback
 */
export async function fetchAPI<T = any>(
  baseUrl: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; isMockFallback?: boolean; rawStatus?: number }> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const targetUrl = `${cleanBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (isDemoUrl(baseUrl)) {
    // Artificial slight network latency for realistic feel (150ms)
    await new Promise((r) => setTimeout(r, 200));

    // Handle DEMO endpoints
    if (endpoint.includes('/tickets')) {
      if (options.method === 'PUT') {
        const body = options.body ? JSON.parse(options.body as string) : {};
        if (body.action === 'RESOLVE' && body.ticket_id) {
          demoTicketsState = demoTicketsState.map((t) =>
            t.ticket_id === body.ticket_id ? { ...t, status: 'RESOLVED' } : t
          );
        }
        return { data: { success: true, message: `Ticket ${body.ticket_id} resolved successfully.` } as any, isMockFallback: true };
      }
      return { data: demoTicketsState as any, isMockFallback: true };
    }

    if (endpoint.includes('/commands')) {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const newLog: C2DCommandLog = {
        id: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
        machine_id: body.machine_id || 'PLASMA-GEN-001',
        command: body.command || 'UNKNOWN',
        payload: body,
        timestamp: new Date().toLocaleTimeString(),
        status: 'SUCCESS',
        httpStatus: 200,
        responseData: {
          dispatch_id: `aws-iot-${Date.now()}`,
          status: 'EXECUTED_ACKNOWLEDGED',
          latency_ms: Math.floor(12 + Math.random() * 25),
        },
      };
      demoCommandLogs.unshift(newLog);

      // If command is STOP or START, update ticket/machine status simulation
      if (body.command === 'STOP' && body.machine_id) {
        // Resolve critical tickets for that machine as it safely shut down
        demoTicketsState = demoTicketsState.map((t) =>
          t.machine_id === body.machine_id ? { ...t, status: 'RESOLVED' } : t
        );
      }

      return { data: { message: `C2D Command '${body.command}' sent to ${body.machine_id}`, log: newLog } as any, isMockFallback: true };
    }

    return { data: { status: 'OK', demo: true } as any, isMockFallback: true };
  }

  // REAL AWS API GATEWAY FETCH
  try {
    const response = await fetch(targetUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    const rawText = await response.text();
    let parsedData: any;

    try {
      const json = JSON.parse(rawText);
      parsedData = parseApiGatewayResponse(json);
    } catch {
      parsedData = rawText;
    }

    if (!response.ok) {
      const errMessage =
        typeof parsedData === 'object' && parsedData?.message
          ? parsedData.message
          : `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errMessage);
    }

    return { data: parsedData, rawStatus: response.status };
  } catch (err: any) {
    console.warn(`[DX Command Center] API Request to ${targetUrl} failed:`, err);
    
    // Fallback to mock data if live fetch fails (CORS or server down), but throw error so caller can alert
    throw err;
  }
}
