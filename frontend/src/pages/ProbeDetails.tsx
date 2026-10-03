import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { NetworkDevice } from '../types/device';
import { AddDeviceModal } from '../components/dashboard/AddDeviceModal';
import { BulkAddDeviceModal } from '../components/dashboard/BulkAddDeviceModal';
import { MonitoringConfig } from '../types/device';

interface Probe {
  id: string;
  name: string;
  location: string | null;
  last_heartbeat: string | null;
  agent_version: string;
  is_active: boolean;
  pending_scan_subnet: string | null;
  last_scan_results: any[] | null;
}

export const ProbeDetails: React.FC = () => {
  const { probeId } = useParams<{ probeId: string }>();
  const navigate = useNavigate();
  const [probe, setProbe] = useState<Probe | null>(null);
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showScanModal, setShowScanModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [scanSubnet, setScanSubnet] = useState('192.168.1.0/24');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  const handleManualAdd = async (device: any) => {
    try {
      const backendPayload = {
        name: device.name,
        ip_address: device.ip,
        probe_id: device.probe_id || "default-agent",
        hardware_category: device.type,
        mac_address: device.mac,
        hardware_model: device.model,
        location: device.location,
        protocol_config: device.monitoring ? {
          methods: device.monitoring.methods,
          interval_seconds: device.monitoring.intervalSeconds,
          snmp_version: device.monitoring.snmpVersion,
          community_string: device.monitoring.communityString,
          snmp_port: device.monitoring.snmpPort,
          http_url: device.monitoring.httpUrl,
          tcp_target_port: device.monitoring.tcpPort,
          ssh_username: device.monitoring.sshUsername,
          ssh_password: device.monitoring.sshPassword,
          ssh_port: device.monitoring.sshPort,
          wmi_username: device.monitoring.wmiUsername,
          wmi_password: device.monitoring.wmiPassword,
        } : undefined
      };
      await axios.post(`/api/v1/metadata/devices`, backendPayload);
      fetchDetails();
      setShowAddModal(false);
    } catch (err: any) {
      console.error(err);
      alert(`Error adding device: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this device?')) return;
    try {
      await axios.delete(`/api/v1/metadata/devices/${deviceId}`);
      fetchDetails();
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting device: ${err.response?.data?.detail || err.message}`);
    }
  };

  const fetchProbe = async () => {
    try {
      const probeRes = await axios.get(`/api/v1/metadata/probes/${probeId}`);
      setProbe(probeRes.data);
    } catch (err) {
      console.error('Error fetching probe details:', err);
    }
  };

  const fetchDevices = async () => {
    try {
      const devicesRes = await axios.get(`/api/v1/metadata/probes/${probeId}/devices`);
      const mappedDevices = devicesRes.data.map((d: any) => ({
        id: d.id,
        name: d.name,
        ip: d.ip_address,
        mac: d.mac_address || '00:00:00:00:00:00',
        type: d.hardware_category,
        status: d.status.toLowerCase(),
        location: d.location || 'Unknown'
      }));
      setDevices(mappedDevices);
    } catch (err) {
      console.error('Error fetching devices details:', err);
    }
  };

  const fetchDetails = async () => {
    await Promise.all([fetchProbe(), fetchDevices()]);
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    fetchDetails();
    
    // Poll ONLY the probe every 5 seconds (for faster scan feedback)
    const probeInterval = setInterval(fetchProbe, 5000);
    // Poll the devices much slower (every 60 seconds)
    const devicesInterval = setInterval(fetchDevices, 60000);
    
    const handleSync = () => fetchDetails();
    window.addEventListener('manual-sync', handleSync);
    
    return () => {
      clearInterval(probeInterval);
      clearInterval(devicesInterval);
      window.removeEventListener('manual-sync', handleSync);
    };
  }, [probeId]);

  const handleStartScan = async () => {
    try {
      await axios.post(`/api/v1/metadata/probes/${probeId}/scan`, { subnet: scanSubnet });
      setShowScanModal(false);
      fetchDetails();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to start scan: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleBulkAddConfirm = async (config: MonitoringConfig) => {
    if (!probe?.last_scan_results) return;
    try {
      const promises = probe.last_scan_results
        .filter((r) => selectedResults.has(r.ip))
        .map((r) => 
          axios.post(`/api/v1/metadata/devices`, {
            name: r.hostname,
            ip_address: r.ip,
            probe_id: probeId,
            hardware_category: r.type,
            mac_address: r.mac,
            protocol_config: {
              methods: config.methods,
              interval_seconds: config.intervalSeconds,
              snmp_version: config.snmpVersion,
              community_string: config.communityString,
              snmp_port: config.snmpPort,
              http_url: config.httpUrl,
              tcp_target_port: config.tcpPort,
              ssh_username: config.sshUsername,
              ssh_password: config.sshPassword,
              ssh_port: config.sshPort,
              wmi_username: config.wmiUsername,
              wmi_password: config.wmiPassword,
            }
          })
        );
      await Promise.all(promises);
      setSelectedResults(new Set());
      setShowBulkAddModal(false);
      fetchDetails();
    } catch (err) {
      console.error(err);
      alert('Error adding devices.');
    }
  };
  
  const toggleSelection = (ip: string) => {
    const next = new Set(selectedResults);
    if (next.has(ip)) next.delete(ip);
    else next.add(ip);
    setSelectedResults(next);
  };

  const getStatus = (lastHeartbeat: string | null) => {
    if (!lastHeartbeat) return { text: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    
    const dateStr = lastHeartbeat.endsWith('Z') ? lastHeartbeat : `${lastHeartbeat}Z`;
    const lastTime = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffSeconds = (now - lastTime) / 1000;
    
    if (diffSeconds > 30) {
      return { text: 'Offline', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    }
    return { text: 'Online', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
  };

  if (isLoading) {
    return <div style={{ color: '#94a3b8', padding: '20px' }}>Loading probe details...</div>;
  }

  if (!probe) {
    return <div style={{ color: '#ef4444', padding: '20px' }}>Probe not found.</div>;
  }

  const currentStatus = getStatus(probe.last_heartbeat);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <button 
        onClick={() => navigate('/probes')}
        style={{ 
          background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', 
          fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start'
        }}
      >
        ← Back to Probes
      </button>

      {/* Top Metrics Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '8px' }}>Status</div>
          <div style={{ color: currentStatus.color, fontSize: '1.5rem', fontWeight: 700 }}>
            {currentStatus.text}
          </div>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '8px' }}>Agent Version</div>
          <div style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: 700 }}>{probe.agent_version}</div>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '8px' }}>Monitored Devices</div>
          <div style={{ color: '#38bdf8', fontSize: '1.5rem', fontWeight: 700 }}>{devices.length}</div>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '8px' }}>Last Heartbeat</div>
          <div style={{ color: '#cbd5e1', fontSize: '1.1rem', fontWeight: 600 }}>
            {probe.last_heartbeat ? new Date(probe.last_heartbeat.endsWith('Z') ? probe.last_heartbeat : `${probe.last_heartbeat}Z`).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Discovery Scan Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <h3 style={{ color: '#f8fafc', margin: 0 }}>Connected Devices</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 16px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#22c55e', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>+</span> Add Device
          </button>
          <button 
            onClick={() => setShowScanModal(true)}
            style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>🔍</span> Run Discovery Scan
          </button>
        </div>
      </div>

      {/* Scan Status & Results */}
      {probe.pending_scan_subnet && (
        <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', padding: '16px', borderRadius: '8px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(56, 189, 248, 0.3)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Scanning network {probe.pending_scan_subnet}... Waiting for agent to report back.
        </div>
      )}

      {!probe.pending_scan_subnet && probe.last_scan_results && probe.last_scan_results.length > 0 && (
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, color: '#f8fafc' }}>Scan Results (Found {probe.last_scan_results.length})</h4>
            {selectedResults.size > 0 && (
              <button onClick={() => setShowBulkAddModal(true)} style={{ padding: '8px 16px', background: '#22c55e', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                Add {selectedResults.size} Selected Devices
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {probe.last_scan_results.map((res: any) => {
              const isAlreadyAdded = devices.some((d: any) => d.ip === res.ip);
              return (
              <label key={res.ip} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', cursor: isAlreadyAdded ? 'not-allowed' : 'pointer', border: '1px solid #1e293b', opacity: isAlreadyAdded ? 0.6 : 1 }}>
                <input 
                  type="checkbox" 
                  checked={isAlreadyAdded || selectedResults.has(res.ip)} 
                  disabled={isAlreadyAdded}
                  onChange={() => !isAlreadyAdded && toggleSelection(res.ip)} 
                  style={{ width: '18px', height: '18px', cursor: isAlreadyAdded ? 'not-allowed' : 'pointer' }} 
                />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{res.hostname}</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{res.ip} • {res.type}</span>
                </div>
                {isAlreadyAdded && (
                  <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                    Already Added
                  </span>
                )}
              </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Discovery Modal */}
      {showScanModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#0b1120', border: '1px solid #1e293b', borderRadius: '12px', width: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, color: '#f8fafc' }}>Run Network Discovery</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>The agent will scan the local subnet for new hardware.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}>Subnet / CIDR</label>
              <input value={scanSubnet} onChange={e => setScanSubnet(e.target.value)} style={{ padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button onClick={() => setShowScanModal(false)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleStartScan} style={{ padding: '10px 16px', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Start Scan</button>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Device Name</th>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>IP Address</th>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No devices assigned to this probe.</td></tr>
            ) : devices.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '16px 20px', color: '#f8fafc', fontWeight: 600 }}>
                  <span 
                    onClick={() => navigate(`/devices/${d.id}`)}
                    style={{ cursor: 'pointer', color: '#38bdf8', textDecoration: 'none', transition: 'all 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {d.name}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', color: '#94a3b8', fontFamily: 'monospace' }}>{d.ip}</td>
                <td style={{ padding: '16px 20px', color: '#cbd5e1', textTransform: 'capitalize' }}>{d.type}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ 
                    backgroundColor: d.status === 'online' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', 
                    color: d.status === 'online' ? '#22c55e' : '#ef4444', 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 
                  }}>
                    {d.status}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => navigate(`/devices/${d.id}`)}
                      style={{
                        background: 'transparent', border: '1px solid #3b82f6', color: '#60a5fa', 
                        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = 'white'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#60a5fa'; }}
                    >
                      Inspect
                    </button>
                    <button 
                      onClick={() => handleDeleteDevice(d.id)}
                      style={{
                        background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', 
                        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Device Modal */}
      <AddDeviceModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAddDevice={handleManualAdd} 
        prefilledProbeId={probeId} 
      />

      <BulkAddDeviceModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        selectedCount={selectedResults.size}
        onConfirm={handleBulkAddConfirm}
      />
    </div>
  );
};
