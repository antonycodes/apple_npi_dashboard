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

export type DeskAlertStatus = 'pending' | 'acknowledged';

export function deskAlertStatus(alert: DeskAlert): DeskAlertStatus {
  return alert.acknowledgedAt ? 'acknowledged' : 'pending';
}
