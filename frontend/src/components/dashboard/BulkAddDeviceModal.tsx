import React, { useState } from 'react';
import { MonitoringMethod, MonitoringConfig } from '../../types/device';

interface BulkAddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (config: MonitoringConfig) => void;
}

const AVAILABLE_PROTOCOLS = [
  { key: 'icmp', label: 'ICMP', desc: 'Heartbeat Ping' },
  { key: 'snmp', label: 'SNMP', desc: 'Network Metrics' },
  { key: 'ssh', label: 'SSH', desc: 'OS Level Metrics' },
  { key: 'wmi', label: 'WMI', desc: 'Windows Metrics' },
  { key: 'http', label: 'HTTP/S', desc: 'Web Request' },
  { key: 'tcp', label: 'TCP', desc: 'Port Probe' },
];

export const BulkAddDeviceModal: React.FC<BulkAddDeviceModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
}) => {
  const [selectedMethods, setSelectedMethods] = useState<MonitoringMethod[]>(['icmp']);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(30);
  
  const [snmpVersion, setSnmpVersion] = useState<'v2c' | 'v3'>('v2c');
  const [communityString, setCommunityString] = useState('public');
  const [snmpPort, setSnmpPort] = useState<number>(161);
  const [sshUsername, setSshUsername] = useState('root');
  const [sshPassword, setSshPassword] = useState('');
  const [wmiUsername, setWmiUsername] = useState('Administrator');
  const [wmiPassword, setWmiPassword] = useState('');
  const [httpUrl, setHttpUrl] = useState('https://');
  const [tcpPort, setTcpPort] = useState(80);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleMethod = (method: MonitoringMethod) => {
    if (selectedMethods.includes(method)) {
      if (selectedMethods.length === 1) {
        setError('At least one monitoring method must remain active.');
        return;
      }
      setSelectedMethods(selectedMethods.filter((m) => m !== method));
      setError('');
    } else {
      setSelectedMethods([...selectedMethods, method]);
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMethods.length === 0) {
      setError('Please select at least one monitoring protocol.');
      return;
    }

    const monitoring: MonitoringConfig = {
      methods: selectedMethods,
      intervalSeconds,
      ...(selectedMethods.includes('snmp') && {
        snmpVersion,
        communityString: communityString.trim() || 'public',
        snmpPort,
      }),
      ...(selectedMethods.includes('ssh') && {
        sshUsername: sshUsername.trim() || 'root',
        sshPassword: sshPassword.trim() || undefined,
        sshPort: 22,
      }),
      ...(selectedMethods.includes('wmi') && {
        wmiUsername: wmiUsername.trim() || 'Administrator',
        wmiPassword: wmiPassword.trim() || undefined,
      }),
      ...(selectedMethods.includes('http') && {
        httpUrl: httpUrl.trim() || 'http://localhost',
      }),
      ...(selectedMethods.includes('tcp') && {
        tcpPort: tcpPort || 80,
      })
    };

    onConfirm(monitoring);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
          padding: '32px', width: '100%', maxWidth: '600px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column', gap: '24px',
          maxHeight: '90vh', overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc', fontWeight: 700 }}>
            Bulk Add {selectedCount} Devices
          </h2>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            Set a global protocol configuration for all selected devices.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Protocol Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Monitoring Protocols
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {AVAILABLE_PROTOCOLS.map(proto => (
                <div
                  key={proto.key}
                  onClick={() => toggleMethod(proto.key as MonitoringMethod)}
                  style={{
                    background: selectedMethods.includes(proto.key as MonitoringMethod) ? 'rgba(56, 189, 248, 0.1)' : 'rgba(15, 23, 42, 0.4)',
                    border: `1px solid ${selectedMethods.includes(proto.key as MonitoringMethod) ? '#38bdf8' : '#334155'}`,
                    padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column', gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: selectedMethods.includes(proto.key as MonitoringMethod) ? '#38bdf8' : '#f8fafc', fontWeight: 600, fontSize: '0.9rem' }}>
                      {proto.label}
                    </span>
                    {selectedMethods.includes(proto.key as MonitoringMethod) && (
                      <span style={{ color: '#38bdf8', fontSize: '1.2rem' }}>✓</span>
                    )}
                  </div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{proto.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Polling Interval (Seconds)</label>
            <input
              type="number" min="10" max="3600" value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(Number(e.target.value))}
              style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', color: 'white', padding: '10px 12px', borderRadius: '8px' }}
            />
          </div>

          {/* Conditional Protocol Fields */}
          {selectedMethods.includes('snmp') && (
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid #334155', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(56, 189, 248, 0.2)', padding: '4px 8px', borderRadius: '4px' }}>SNMP Configuration</span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Version</label>
                  <select value={snmpVersion} onChange={(e: any) => setSnmpVersion(e.target.value)} style={{ background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '10px 12px', borderRadius: '8px' }}>
                    <option value="v1">v1</option>
                    <option value="v2c">v2c</option>
                    <option value="v3">v3</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Port</label>
                  <input type="number" value={snmpPort} onChange={(e) => setSnmpPort(Number(e.target.value))} style={{ background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '10px 12px', borderRadius: '8px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Community String</label>
                  <input type="text" value={communityString} onChange={(e) => setCommunityString(e.target.value)} placeholder="public" style={{ background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '10px 12px', borderRadius: '8px' }} />
                </div>
              </div>
            </div>
          )}

          {selectedMethods.includes('wmi') && (
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid #334155', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(56, 189, 248, 0.2)', padding: '4px 8px', borderRadius: '4px' }}>WMI Configuration</span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Windows Username</label>
                  <input type="text" value={wmiUsername} onChange={(e) => setWmiUsername(e.target.value)} placeholder="Administrator" style={{ background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '10px 12px', borderRadius: '8px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Password</label>
                  <input type="password" value={wmiPassword} onChange={(e) => setWmiPassword(e.target.value)} placeholder="••••••••" style={{ background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '10px 12px', borderRadius: '8px' }} />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" style={{ flex: 1, background: '#38bdf8', border: 'none', color: '#0f172a', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
              Add {selectedCount} Devices
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default BulkAddDeviceModal;
