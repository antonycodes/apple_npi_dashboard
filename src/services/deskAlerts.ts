export interface DeskAlert {
  id: string;
  deskId: string;
  role: string;
  stt: string | null;
  customerName: string | null;
  callerMsnv?: string | null;
  createdAt: number;
  acknowledgedAt?: number | null;
  acknowledgedBy?: string | null;
  acknowledgedByMsnv?: string | null;
}

/**
 * Local dashboard notice for a customer who reached End flow without device
 * acceptance. It is intentionally separate from DeskAlert: closing it only
 * affects the current DP screen and never acknowledges a shared alert.
 */
export interface EndFlowDeviceAlert {
  id: string;
  stt: string;
  customerName: string | null;
}

export type DeskAlertStatus = 'pending' | 'acknowledged';

export function deskAlertStatus(alert: DeskAlert): DeskAlertStatus {
  return alert.acknowledgedAt ? 'acknowledged' : 'pending';
}
