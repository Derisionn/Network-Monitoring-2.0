export type DeviceType = string;

export type DeviceStatus = 'online' | 'warning' | 'offline' | 'degraded';

export type MonitoringMethod = 'icmp' | 'snmp' | 'ssh' | 'wmi' | 'http' | 'tcp';

export interface MonitoringConfig {
  methods: MonitoringMethod[]; // Multi-protocol support
  intervalSeconds?: number;
  
  // Protocol specific configs (Optional)
  snmpVersion?: 'v2c' | 'v3';
  communityString?: string;
  snmpPort?: number;
  
  sshUsername?: string;
  sshPassword?: string;
  sshPort?: number;
  
  wmiUsername?: string;
  wmiPassword?: string;
  
  httpUrl?: string;
  
  tcpPort?: number;
}

export interface NetworkInterface {
  name: string;
  mac: string;
  ip: string;
  status: 'up' | 'down';
  speedMbps: number;
}

export interface NetworkDevice {
  id: string;
  probe_id?: string;
  name: string;
  ip: string;
  mac: string;
  type: DeviceType;
  status: DeviceStatus;
  location: string;
  uptime: string;
  latencyMs: number;
  packetLossPercent: number;
  availability24hPercent?: number;
  timeline24h?: { hour: number; time_label: string; timestamp?: string; status: 'UP' | 'DOWN' | 'WARNING' | 'NOT_MONITORED'; up_count?: number; down_count?: number }[];
  bandwidthUsageMbps: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  storageUsagePercent?: number;
  lastSeen: string;
  model?: string;
  firmware?: string;
  interfaces?: NetworkInterface[];
  monitoring?: MonitoringConfig;
  snmp_data?: any;
  throughput_history?: { time: string; value: number }[];
  supported_protocols?: string[];
}
