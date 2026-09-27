import React from 'react';
import { StatCard } from '../components/dashboard/StatCard';

import { DeviceTable } from '../components/dashboard/DeviceTable';
import { NetworkDevice } from '../types/device';

interface DashboardProps {
  devices: NetworkDevice[];
  onSelectDevice: (device: NetworkDevice) => void;
  onNavigateToAlerts?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  devices,
  onSelectDevice,
  onNavigateToAlerts,
}) => {
  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const criticalIssues = 0; // Temporarily 0 until alerts API is built
  const validLatencies = devices.filter((d) => d.status !== 'offline');
  const avgLatency = validLatencies.length
    ? (validLatencies.reduce((acc, d) => acc + d.latencyMs, 0) / validLatencies.length).toFixed(1)
    : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Critical Alert Notice if any */}
      {criticalIssues > 0 && (
        <div
          onClick={onNavigateToAlerts}
          style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.2rem', color: '#ef4444' }}>⚠</span>
            <div>
              <span style={{ fontWeight: 700, color: '#f87171', fontSize: '0.9rem' }}>
                {criticalIssues} Unresolved Critical Incident{criticalIssues > 1 ? 's' : ''}
              </span>
              <span style={{ color: '#cbd5e1', fontSize: '0.82rem', marginLeft: '8px' }}>
                Storage-SAN-Node01 is currently offline. Review diagnostic alert logs.
              </span>
            </div>
          </div>
          <span style={{ color: '#f87171', fontSize: '0.82rem', fontWeight: 600 }}>
            View Alerts →
          </span>
        </div>
      )}

      {/* Top Stat Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <StatCard
          label="Total Infrastructure"
          value={totalDevices}
          subtext="Routers, Switches, Firewalls & APs"
          symbol="◈"
          accentColor="#38bdf8"
        />
        <StatCard
          label="Online Nodes"
          value={`${onlineDevices}/${totalDevices}`}
          subtext={`${((onlineDevices / (totalDevices || 1)) * 100).toFixed(1)}% system availability`}
          change="+1.2%"
          isPositive={true}
          symbol="◉"
          accentColor="#10b981"
        />

      </div>



      {/* Live Device Telemetry Table */}
      <DeviceTable
        devices={devices}
        onSelectDevice={onSelectDevice}
      />
    </div>
  );
};

export default Dashboard;
