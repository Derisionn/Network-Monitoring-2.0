import { NetworkDevice } from '../types';

const mapDeviceFromBackend = (dev: any): NetworkDevice => {
  // Extract averages from snmp_data if available
  let cpuUsage = 0;
  if (dev.snmp_data?.CPU?.Cores?.length > 0) {
    cpuUsage = Math.round(dev.snmp_data.CPU.Cores.reduce((acc: number, core: any) => acc + core.usage, 0) / dev.snmp_data.CPU.Cores.length);
  }

  return {
    ...dev,
    id: dev.id,
    latencyMs: dev.latest_latency_ms ?? dev.latencyMs ?? 0,
    packetLossPercent: dev.rolling_packet_loss ?? dev.latest_packet_loss ?? dev.packetLossPercent ?? 0,
    availability24hPercent: dev.availability_24h_percent ?? dev.availability24hPercent ?? 100,
    timeline24h: dev.timeline_24h ?? dev.timeline24h ?? [],
    memoryUsagePercent: dev.snmp_data?.Memory?.UsedPercent ?? dev.memoryUsagePercent ?? 0,
    storageUsagePercent: dev.snmp_data?.Storage?.UsedPercent ?? dev.storageUsagePercent ?? 0,
    cpuUsagePercent: cpuUsage || dev.cpuUsagePercent || 0,
    bandwidthUsageMbps: dev.snmp_data?.Interfaces ? 
      Object.values(dev.snmp_data.Interfaces).reduce((acc: number, curr: any) => acc + parseFloat(curr.In || '0') + parseFloat(curr.Out || '0'), 0)
      : (dev.bandwidthUsageMbps || 0)
  };
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = {
  getDevices: async (): Promise<NetworkDevice[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/`);
      if (!response.ok) {
        throw new Error(`Error fetching devices: ${response.statusText}`);
      }
      const data = await response.json();
      return data.map(mapDeviceFromBackend);
    } catch (error) {
      console.error('API Error (getDevices):', error);
      return [];
    }
  },
  
  getDevice: async (id: string): Promise<NetworkDevice | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching device ${id}: ${response.statusText}`);
      }
      const data = await response.json();
      return mapDeviceFromBackend(data);
    } catch (error) {
      console.error(`API Error (getDevice ${id}):`, error);
      return null;
    }
  }
};
