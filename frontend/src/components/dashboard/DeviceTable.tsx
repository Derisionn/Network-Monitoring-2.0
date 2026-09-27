import React, { useState, useMemo } from 'react';
import { NetworkDevice, DeviceStatus, DeviceType } from '../../types/device';
import { StatusBadge } from '../common/StatusBadge';

export interface DeviceTableProps {
  devices?: NetworkDevice[];
  onSelectDevice?: (device: NetworkDevice) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  onAddDevice?: () => void;
  onDeleteDevice?: (id: string) => void;
}

const defaultDevices: NetworkDevice[] = [
  {
    id: 'dev-001',
    name: 'Core-Router-GW01',
    ip: '192.168.1.1',
    mac: '00:1A:2B:3C:4D:5E',
    type: 'router',
    status: 'online',
    location: 'Data Center Rack A1',
    uptime: '142d 6h 12m',
    latencyMs: 1.4,
    packetLossPercent: 0.0,
    bandwidthUsageMbps: 842.5,
    cpuUsagePercent: 34,
    memoryUsagePercent: 52,
    lastSeen: 'Just now',
    model: 'Cisco ISR 4451',
  },
  {
    id: 'dev-002',
    name: 'Dist-Switch-SW02',
    ip: '192.168.1.2',
    mac: '00:1A:2B:3C:4D:5F',
    type: 'switch',
    status: 'online',
    location: 'Floor 2 Comm Room',
    uptime: '98d 14h 45m',
    latencyMs: 2.1,
    packetLossPercent: 0.0,
    bandwidthUsageMbps: 412.0,
    cpuUsagePercent: 22,
    memoryUsagePercent: 41,
    lastSeen: 'Just now',
    model: 'Arista 7050SX',
  },
  {
    id: 'dev-003',
    name: 'HQ-Firewall-FW01',
    ip: '192.168.1.254',
    mac: '00:1A:2B:3C:4D:60',
    type: 'firewall',
    status: 'warning',
    location: 'Data Center Rack A2',
    uptime: '45d 02h 10m',
    latencyMs: 14.8,
    packetLossPercent: 1.2,
    bandwidthUsageMbps: 950.2,
    cpuUsagePercent: 88,
    memoryUsagePercent: 79,
    lastSeen: '1 min ago',
    model: 'Palo Alto PA-3220',
  },
  {
    id: 'dev-004',
    name: 'AP-Conference-Room-B',
    ip: '192.168.10.45',
    mac: '00:1A:2B:3C:4D:61',
    type: 'access_point',
    status: 'online',
    location: 'Building B - Conf Room 3',
    uptime: '12d 18h 30m',
    latencyMs: 6.5,
    packetLossPercent: 0.0,
    bandwidthUsageMbps: 68.4,
    cpuUsagePercent: 18,
    memoryUsagePercent: 35,
    lastSeen: 'Just now',
    model: 'UniFi U6 Enterprise',
  },
  {
    id: 'dev-005',
    name: 'Storage-SAN-Node01',
    ip: '192.168.20.10',
    mac: '00:1A:2B:3C:4D:62',
    type: 'server',
    status: 'offline',
    location: 'Data Center Rack C4',
    uptime: '0d 0h 0m',
    latencyMs: 0,
    packetLossPercent: 100.0,
    bandwidthUsageMbps: 0.0,
    cpuUsagePercent: 0,
    memoryUsagePercent: 0,
    lastSeen: '18 mins ago',
    model: 'Dell PowerEdge R750',
  },
  {
    id: 'dev-006',
    name: 'Edge-Router-Site2',
    ip: '10.200.4.1',
    mac: '00:1A:2B:3C:4D:63',
    type: 'router',
    status: 'degraded',
    location: 'Remote Branch Office',
    uptime: '3d 11h 24m',
    latencyMs: 94.2,
    packetLossPercent: 7.8,
    bandwidthUsageMbps: 45.1,
    cpuUsagePercent: 76,
    memoryUsagePercent: 68,
    lastSeen: '2 mins ago',
    model: 'Fortinet FortiGate 60F',
  },
];

type SortField = 'name' | 'ip' | 'type' | 'status' | 'latencyMs' | 'packetLossPercent' | 'uptime';
type SortOrder = 'asc' | 'desc';

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices = defaultDevices,
  onSelectDevice,
  onRefresh,
  isLoading = false,
  onAddDevice,
  onDeleteDevice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const filteredAndSortedDevices = useMemo(() => {
    return devices
      .filter((device) => {
        const matchesSearch =
          device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          device.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
          device.mac.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (device.location && device.location.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
        const matchesType = typeFilter === 'all' || device.type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (valA === undefined) return 1;
        if (valB === undefined) return -1;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        return 0;
      });
  }, [devices, searchTerm, statusFilter, typeFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderLatencyTag = (latency: number, status: DeviceStatus) => {
    if (status === 'offline') return <span style={{ color: '#64748b' }}>N/A</span>;

    let color = '#10b981';
    if (latency > 80) color = '#ef4444';
    else if (latency > 25) color = '#f59e0b';

    return (
      <span style={{ color, fontWeight: 600 }}>
        {latency.toFixed(1)} ms
      </span>
    );
  };

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: '16px',
        border: '1px solid #1e293b',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
        padding: '24px',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Monitored Network Devices
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Live status and diagnostics for all infrastructure nodes ({filteredAndSortedDevices.length} / {devices.length})
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search IP, name, MAC, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 14px',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
              minWidth: '240px',
            }}
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="online">Online</option>
            <option value="warning">Warning</option>
            <option value="degraded">Degraded</option>
            <option value="offline">Offline</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Types</option>
            <option value="router">Router</option>
            <option value="switch">Switch</option>
            <option value="firewall">Firewall</option>
            <option value="server">Server</option>
            <option value="access_point">Access Point</option>
          </select>

          {onAddDevice && (
            <button
              onClick={onAddDevice}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
              }}
            >
              <span>+</span>
              <span>Add Device</span>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              style={{
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {/* Table Element */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '0',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <th
                onClick={() => handleSort('name')}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  borderTopLeftRadius: '8px',
                }}
              >
                Device Name {sortField === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                onClick={() => handleSort('ip')}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                IP Address {sortField === 'ip' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                onClick={() => handleSort('type')}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                Type {sortField === 'type' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                onClick={() => handleSort('status')}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                Status {sortField === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                onClick={() => handleSort('latencyMs')}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                Latency {sortField === 'latencyMs' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                onClick={() => handleSort('packetLossPercent')}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                Packet Loss {sortField === 'packetLossPercent' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                onClick={() => handleSort('uptime')}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                Uptime {sortField === 'uptime' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  textAlign: 'right',
                  borderTopRightRadius: '8px',
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedDevices.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '36px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '0.9rem',
                  }}
                >
                  No devices found matching the current search and filter criteria.
                </td>
              </tr>
            ) : (
              filteredAndSortedDevices.map((device, index) => (
                <tr
                  key={device.id}
                  style={{
                    borderBottom: '1px solid #1e293b',
                    backgroundColor: index % 2 === 0 ? 'rgba(30, 41, 59, 0.35)' : 'transparent',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(51, 65, 85, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      index % 2 === 0 ? 'rgba(30, 41, 59, 0.35)' : 'transparent';
                  }}
                >
                  {/* Name & Model */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{device.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {device.probe_id ? `Probe: ${device.probe_id}` : (device.model || device.location)}
                    </div>
                  </td>

                  {/* IP Address & MAC */}
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    <div style={{ color: '#38bdf8' }}>{device.ip}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{device.mac}</div>
                  </td>

                  {/* Type & Method */}
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: '#334155',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          color: '#cbd5e1',
                          textTransform: 'capitalize',
                        }}
                      >
                        {device.type.replace('_', ' ')}
                      </span>
                      {device.monitoring && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: '#38bdf8',
                            fontFamily: 'monospace',
                            letterSpacing: '0.02em',
                            fontWeight: 600,
                          }}
                        >
                          {device.monitoring.methods
                            ? device.monitoring.methods.map((m) => m.toUpperCase()).join(' + ')
                            : (device.monitoring as any).method?.toUpperCase()}
                          {device.monitoring.snmpVersion ? ` ${device.monitoring.snmpVersion}` : ''}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={device.status} />
                  </td>

                  {/* Latency */}
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                    {renderLatencyTag(device.latencyMs, device.status)}
                  </td>

                  {/* Packet Loss */}
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                    {device.status === 'offline' ? (
                      <span style={{ color: '#ef4444' }}>100%</span>
                    ) : (
                      <span
                        style={{
                          color: device.packetLossPercent > 0 ? '#f59e0b' : '#94a3b8',
                          fontWeight: device.packetLossPercent > 0 ? 600 : 400,
                        }}
                      >
                        {device.packetLossPercent.toFixed(1)}%
                      </span>
                    )}
                  </td>

                  {/* Uptime */}
                  <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>
                    {device.uptime}
                  </td>

                  {/* Action */}
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => onSelectDevice?.(device)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #3b82f6',
                          color: '#60a5fa',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#3b82f6';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#60a5fa';
                        }}
                      >
                        Inspect
                      </button>
                      {onDeleteDevice && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDevice(device.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid #ef4444',
                            color: '#f87171',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ef4444';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#f87171';
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeviceTable;
