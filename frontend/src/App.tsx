import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { NavItemKey } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Devices } from './pages/Devices';
import { DeviceDetails } from './pages/DeviceDetails';
import { Alerts } from './pages/Alerts';
import { Probes } from './pages/Probes';
import { ProbeDetails } from './pages/ProbeDetails';
import { HealthChart } from './components/dashboard/HealthChart';
import { AddDeviceModal } from './components/dashboard/AddDeviceModal';
import { NetworkDevice } from './types/device';

// A wrapper component to extract the URL params for DeviceDetails
import { useParams } from 'react-router-dom';

const DeviceDetailsWrapper: React.FC<{ devices: NetworkDevice[], onDelete: (id: string) => void, onRefresh: () => void }> = ({ devices, onDelete, onRefresh }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const device = devices.find(d => d.id === id);
  
  if (!device) {
    return <div style={{ color: '#f8fafc', padding: '20px' }}>Loading device... or not found.</div>;
  }
  
  return <DeviceDetails device={device} onBack={() => navigate('/devices')} onDelete={onDelete} onRefresh={onRefresh} />;
};

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(true);

  const fetchDevices = async () => {
    try {
      const response = await axios.get('/api/v1/metadata/devices');
      const backendDevices = response.data.map((d: any) => {
        let totalBandwidth = 0;
        if (d.snmp_data?.Interfaces) {
          Object.values(d.snmp_data.Interfaces).forEach((iface: any) => {
            const inMbps = parseFloat(iface.In || '0');
            const outMbps = parseFloat(iface.Out || '0');
            totalBandwidth += inMbps + outMbps;
          });
        }

        return {
          id: d.id,
          probe_id: d.probe_id,
          name: d.name,
          ip: d.ip_address,
          mac: d.mac_address || '00:00:00:00:00:00',
          type: (d.hardware_category || 'server') as any,
          status: (d.status.toLowerCase() === 'online' ? (d.rolling_packet_loss > 0 ? 'warning' : 'online') : 'offline') as any,
          location: d.location || 'Unknown',
          uptime: d.snmp_data?.System?.Uptime || 'Unknown',
          latencyMs: d.latest_latency_ms || 0,
          packetLossPercent: d.rolling_packet_loss || 0,
          availability24hPercent: d.availability_24h_percent,
          timeline24h: d.timeline_24h,
          bandwidthUsageMbps: parseFloat(totalBandwidth.toFixed(2)),
          cpuUsagePercent: d.snmp_data?.CPU?.UsedPercent ?? 0,
          memoryUsagePercent: d.snmp_data?.Memory?.UsedPercent ?? 0,
          storageUsagePercent: d.snmp_data?.Storage?.UsedPercent ?? 0,
          lastSeen: d.last_seen || 'Never',
          snmp_data: d.snmp_data,
          throughput_history: d.throughput_history,
          monitoring: d.monitoring ? {
            methods: d.monitoring.methods,
            intervalSeconds: d.monitoring.interval_seconds,
            snmpVersion: d.monitoring?.snmp_version,
            communityString: d.monitoring?.community_string,
            snmpPort: d.monitoring?.snmp_port,
          } : undefined
        };
      });
      setDevices(backendDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
    }
  };

  const checkHealth = async () => {
    try {
      await axios.get('/health', { timeout: 3000 });
      setIsBackendOnline(true);
    } catch (error) {
      setIsBackendOnline(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    checkHealth();
    const intervalId = setInterval(() => {
      fetchDevices();
      checkHealth();
    }, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDevices();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  const handleSelectDevice = (device: NetworkDevice) => {
    navigate(`/devices/${device.id}`);
  };

  const handleAddDevice = async (newDevice: NetworkDevice) => {
    try {
      const backendPayload = {
        name: newDevice.name,
        ip_address: newDevice.ip,
        mac_address: newDevice.mac || null,
        hardware_category: newDevice.type,
        hardware_model: newDevice.model || null,
        location: newDevice.location || null,
        status: newDevice.status,
        protocol_config: newDevice.monitoring ? {
          methods: newDevice.monitoring.methods,
          interval_seconds: newDevice.monitoring.intervalSeconds,
          snmp_version: newDevice.monitoring.snmpVersion,
          community_string: newDevice.monitoring.communityString,
          snmp_port: newDevice.monitoring.snmpPort,
          v3_username: (newDevice.monitoring as any).v3Username,
          v3_auth_protocol: (newDevice.monitoring as any).v3AuthProtocol,
          v3_auth_key: (newDevice.monitoring as any).v3AuthKey,
          v3_priv_protocol: (newDevice.monitoring as any).v3PrivProtocol,
          v3_priv_key: (newDevice.monitoring as any).v3PrivKey,
          http_url: newDevice.monitoring.httpUrl,
          tcp_target_port: newDevice.monitoring.tcpPort,
          ssh_username: newDevice.monitoring.sshUsername,
          ssh_password: newDevice.monitoring.sshPassword,
          ssh_port: newDevice.monitoring.sshPort,
          wmi_username: newDevice.monitoring.wmiUsername,
          wmi_password: newDevice.monitoring.wmiPassword,
        } : undefined
      };
      await axios.post('/api/v1/metadata/devices', backendPayload);
      await fetchDevices();
    } catch (error) {
      console.error('Error adding device:', error);
      alert('Failed to add device to the backend API.');
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await axios.delete(`/api/v1/metadata/devices/${id}`);
        await fetchDevices();
        if (location.pathname.startsWith(`/devices/${id}`)) {
          navigate('/devices');
        }
      } catch (error) {
        console.error('Error deleting device:', error);
        alert('Failed to delete device from backend.');
      }
    }
  };

  const getHeaderMeta = () => {
    const path = location.pathname;
    if (path.startsWith('/devices/')) {
      const id = path.split('/')[2];
      const selectedDevice = devices.find(d => d.id === id);
      return {
        title: selectedDevice ? `◉ Device: ${selectedDevice.name}` : '◉ Hardware Inventory',
        subtitle: selectedDevice
          ? `IP: ${selectedDevice.ip} | MAC: ${selectedDevice.mac}`
          : 'Detailed inventory of switches, routers, firewalls, and endpoints',
      };
    }
    
    switch (path) {
      case '/':
        return {
          title: '▣ Dashboard Overview',
          subtitle: 'Live network health, active node telemetry, and system availability',
        };
      case '/devices':
        return {
          title: '◉ Hardware Inventory',
          subtitle: 'Detailed inventory of switches, routers, firewalls, and endpoints',
        };
      case '/probes':
        return {
          title: '📡 Probes & Agents',
          subtitle: 'Manage remote collection agents and deployment scripts',
        };
      case '/monitoring':
        return {
          title: '◇ Live Telemetry & Monitoring',
          subtitle: 'Interface traffic curves, bandwidth saturation, and round-trip time latency',
        };
      case '/alerts':
        return {
          title: '⚠ Active Incidents & Alerts',
          subtitle: 'Real-time threshold breaches, link drops, and critical notifications',
        };

      default:
        if (path.startsWith('/probes/')) {
          const id = path.split('/')[2];
          return {
            title: `📡 Probe Details: ${id}`,
            subtitle: 'Agent health, metrics, and connected devices',
          };
        }
        return {
          title: 'NetMonitor Console',
          subtitle: 'Network Operations Center',
        };
    }
  };

  const { title, subtitle } = getHeaderMeta();

  let currentTab: NavItemKey = 'dashboard';
  if (location.pathname.startsWith('/devices')) currentTab = 'devices';
  else if (location.pathname.startsWith('/probes')) currentTab = 'probes';
  else if (location.pathname === '/alerts') currentTab = 'alerts';

  return (
    <>
      <Layout
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'dashboard') navigate('/');
          else navigate(`/${tab}`);
        }}
        title={title}
        subtitle={subtitle}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onOpenAddDevice={() => setIsAddModalOpen(true)}
        isBackendOnline={isBackendOnline}
      >
        <Routes>
          <Route path="/" element={
            <Dashboard
              devices={devices}
              onSelectDevice={handleSelectDevice}
              onNavigateToAlerts={() => navigate('/alerts')}
              onOpenAddDevice={() => setIsAddModalOpen(true)}
            />
          } />
          
          <Route path="/devices" element={
            <Devices
              devices={devices}
              onSelectDevice={handleSelectDevice}
              onDeleteDevice={handleDeleteDevice}
            />
          } />
          
          <Route path="/devices/:id" element={<DeviceDetailsWrapper devices={devices} onDelete={handleDeleteDevice} onRefresh={fetchDevices} />} />
          
          <Route path="/monitoring" element={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <HealthChart data={[]} />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* Real telemetry cards will be dynamically rendered here once the API is built */}
              </div>
            </div>
          } />
          
          <Route path="/alerts" element={<Alerts />} />
          
          <Route path="/probes" element={<Probes />} />
          <Route path="/probes/:probeId" element={<ProbeDetails />} />
          

        </Routes>
      </Layout>

      {/* Add Device Modal Dialog */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDevice={handleAddDevice}
      />
    </>
  );
};

export default App;
