export * from './device';

export interface NetworkAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceIp: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface NetworkHealthPoint {
  time: string;
  bandwidthInMbps: number;
  bandwidthOutMbps: number;
  avgLatencyMs: number;
  packetLossPercent: number;
}
