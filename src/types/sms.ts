import type { ClusterKey } from './desk';

export type SmsStageStatus = 'pending' | 'active' | 'completed' | 'not-applicable';

export interface SmsStageJourney {
  key: ClusterKey;
  label: string;
  status: SmsStageStatus;
  deskCode: string | null;
  staffName: string | null;
  startedAt: number | null;
  completedAt: number | null;
  elapsedMs: number | null;
}

export interface SmsJourney {
  stt: string;
  name: string;
  phone: string;
  products: string | null;
  checkinAt: number | null;
  endFlow: boolean;
  endFlowTime: string | null;
  smsRequested: boolean;
  stages: Record<ClusterKey, SmsStageJourney>;
}
