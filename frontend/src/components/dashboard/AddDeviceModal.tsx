import React, { useState } from 'react';
import { NetworkDevice, DeviceType, DeviceStatus, MonitoringMethod, MonitoringConfig } from '../../types/device';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDevice: (device: NetworkDevice) => void;
  prefilledProbeId?: string;
}

const MAIN_CATEGORIES = [
  { id: 'server', label: 'Server', icon: '🗄' },
  { id: 'storage', label: 'Storage / Hardware', icon: '💾' },
  { id: 'network', label: 'Network Device', icon: '🖧' },
  { id: 'app', label: 'Application', icon: '⚙' },
  { id: 'db', label: 'Database', icon: '🛢' },
  { id: 'cloud', label: 'Cloud & VM', icon: '☁' }
];

const SUBCATEGORIES: Record<string, { id: string, label: string }[]> = {
  server: [
    { id: 'linux', label: 'Linux Server' },
    { id: 'windows', label: 'Windows Server' },
    { id: 'unix', label: 'Unix / BSD' }
  ],
  storage: [
    { id: 'nas', label: 'NAS (Network Attached Storage)' },
    { id: 'san', label: 'SAN (Storage Area Network)' },
    { id: 'raid', label: 'RAID Controller' },
    { id: 'sensor', label: 'Environmental / UPS' }
  ],
  network: [
    { id: 'router', label: 'Router' },
    { id: 'switch', label: 'Switch' },
    { id: 'firewall', label: 'Firewall' },
    { id: 'access_point', label: 'Access Point' },
    { id: 'load_balancer', label: 'Load Balancer' }
  ],
  app: [
    { id: 'web', label: 'Web Server (Nginx/Apache)' },
    { id: 'app_server', label: 'App Server (Node/Tomcat)' },
    { id: 'http', label: 'Custom HTTP/HTTPS' },
    { id: 'tcp', label: 'Custom TCP/UDP' }
  ],
  db: [
    { id: 'mysql', label: 'MySQL / MariaDB' },
    { id: 'postgres', label: 'PostgreSQL' },
    { id: 'mssql', label: 'SQL Server' },
    { id: 'oracle', label: 'Oracle DB' },
    { id: 'nosql', label: 'MongoDB / Redis' }
  ],
  cloud: [
    { id: 'vmware', label: 'VMware ESXi' },
    { id: 'hyperv', label: 'Hyper-V' },
    { id: 'proxmox', label: 'Proxmox VE' },
    { id: 'aws', label: 'AWS (EC2/RDS)' },
    { id: 'docker', label: 'Docker/K8s' }
  ]
};

// Available Monitoring Protocols
const AVAILABLE_PROTOCOLS = [
  { key: 'icmp', label: 'ICMP', desc: 'Heartbeat Ping' },
  { key: 'snmp', label: 'SNMP', desc: 'Network Metrics' },
  { key: 'ssh', label: 'SSH', desc: 'OS Level Metrics' },
  { key: 'wmi', label: 'WMI', desc: 'Windows Metrics' },
  { key: 'http', label: 'HTTP/S', desc: 'Web Request' },
  { key: 'tcp', label: 'TCP', desc: 'Port Probe' },
];

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onAddDevice,
  prefilledProbeId,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);

  // Device Basic Info
  const [name, setName] = useState('');
  const [ip, setIp] = useState('192.168.1.100');
  const [mac, setMac] = useState('');
  const [type, setType] = useState<DeviceType>('linux');
  const [status, setStatus] = useState<DeviceStatus>('online');
  const [location, setLocation] = useState('');
  const [model, setModel] = useState('');

  // Monitoring Protocol Configuration
  const [selectedMethods, setSelectedMethods] = useState<MonitoringMethod[]>(['icmp', 'ssh']);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(30);
  
  // Specific Fields
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

  // Smart Defaults Logic
  const getSmartDefaults = (subCategoryId: string): MonitoringMethod[] => {
    switch (subCategoryId) {
      case 'linux':
      case 'unix':
      case 'vmware':
      case 'proxmox':
      case 'docker':
        return ['icmp', 'ssh'];
      case 'windows':
      case 'hyperv':
        return ['icmp', 'wmi'];
      case 'router':
      case 'switch':
      case 'firewall':
      case 'access_point':
      case 'load_balancer':
      case 'nas':
      case 'san':
      case 'sensor':
        return ['icmp', 'snmp'];
      case 'web':
      case 'http':
        return ['http'];
      case 'app_server':
      case 'tcp':
      case 'mysql':
      case 'postgres':
      case 'mssql':
      case 'oracle':
      case 'nosql':
        return ['tcp'];
      case 'aws':
        return ['http'];
      default:
        return ['icmp'];
    }
  };

  const getDisabledProtocols = (subCategoryId: string): MonitoringMethod[] => {
    switch (subCategoryId) {
      case 'linux':
      case 'unix':
      case 'vmware':
      case 'proxmox':
      case 'docker':
        return ['wmi'];
      case 'windows':
      case 'hyperv':
        return ['ssh']; // Focus strictly on WMI for Windows in this wizard
      case 'router':
      case 'switch':
      case 'firewall':
      case 'access_point':
      case 'load_balancer':
      case 'nas':
      case 'san':
      case 'sensor':
        return ['wmi'];
      case 'web':
      case 'app_server':
      case 'http':
      case 'tcp':
      case 'mysql':
      case 'postgres':
      case 'mssql':
      case 'oracle':
      case 'nosql':
      case 'aws':
        return ['wmi'];
      default:
        return [];
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedMainCategory(null);
    setName('');
    setIp('192.168.1.100');
    setMac('');
    setType('linux');
    setStatus('online');
    setLocation('');
    setModel('');
    setSelectedMethods(['icmp', 'ssh']);
    setError('');
    onClose();
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedMainCategory(categoryId);
    const initialSub = SUBCATEGORIES[categoryId][0].id;
    setType(initialSub);
    setSelectedMethods(getSmartDefaults(initialSub));
    setStep(2);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    
    // Automatically adjust methods: apply smart defaults and remove disabled ones
    const newDefaults = getSmartDefaults(newType);
    setSelectedMethods(newDefaults);
  };

  const toggleMethod = (method: MonitoringMethod) => {
    if (getDisabledProtocols(type).includes(method)) return;

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

    if (!name.trim()) {
      setError('Target Name is required.');
      return;
    }

    if (selectedMethods.length === 0) {
      setError('Please select at least one monitoring protocol.');
      return;
    }

    // Auto-assign IP if left empty or validate provided IPv4/domain
    const ipOrDomainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$|^(\d{1,3}\.){3}\d{1,3}$/;
    let finalIp = ip.trim();
    if (!finalIp && !selectedMethods.includes('http')) {
      finalIp = `192.168.1.${Math.floor(Math.random() * 180 + 20)}`;
    } else if (finalIp && !ipOrDomainPattern.test(finalIp) && finalIp.toLowerCase() !== 'localhost') {
      setError('Please provide a valid IPv4 address or domain (e.g., 192.168.1.50 or app.render.com).');
      return;
    }

    // Auto-generate MAC if empty
    const generatedMac = mac.trim()
      ? mac.trim().toUpperCase()
      : Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase();

    // Construct multi-method monitoring configuration
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

    const newDevice: NetworkDevice = {
      id: `dev-${Date.now().toString().slice(-4)}`,
      probe_id: prefilledProbeId || 'default-agent',
      name: name.trim(),
      ip: finalIp || 'N/A',
      mac: generatedMac,
      type,
      status,
      location: location.trim() || 'Unassigned',
      model: model.trim() || 'Generic Node',
      uptime: '0d 0h 0m',
      latencyMs: 0,
      packetLossPercent: 0,
      bandwidthUsageMbps: 0,
      cpuUsagePercent: 0,
      memoryUsagePercent: 0,
      lastSeen: 'Never',
      monitoring,
    };

    onAddDevice(newDevice);
    handleClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
              {step === 1 ? 'What do you want to monitor?' : 'Configure Monitoring Target'}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              {step === 1 
                ? 'Select the category of the device or service to add it to your inventory' 
                : 'Smart Defaults have been applied for your selected target.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Content Area */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {step === 1 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px'
            }}>
              {MAIN_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    color: '#f8fafc',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1e293b';
                    e.currentTarget.style.borderColor = '#334155';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ fontSize: '2.5rem' }}>{cat.icon}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{cat.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1. Identification & Setup
                </div>

                {prefilledProbeId && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Assigned Probe
                    </label>
                    <input
                      type="text"
                      disabled
                      value={prefilledProbeId}
                      style={{
                        width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '8px', 
                        padding: '9px 14px', color: '#94a3b8', fontSize: '0.88rem', cursor: 'not-allowed', boxSizing: 'border-box', marginBottom: '6px'
                      }}
                    />
                  </div>
                )}

                {/* Target Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Target Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Core-Switch-SW03 or Web-Prod-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '9px 14px',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* IP and Category row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      IP / Endpoint Address
                    </label>
                    <input
                      type="text"
                      placeholder="192.168.1.100"
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '9px 14px',
                        color: '#38bdf8',
                        fontFamily: 'monospace',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Category: {selectedMainCategory && MAIN_CATEGORIES.find(c => c.id === selectedMainCategory)?.label}
                    </label>
                    <select
                      value={type}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '9px 14px',
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    >
                      {selectedMainCategory && SUBCATEGORIES[selectedMainCategory].map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section 2: Multi-Protocol Monitoring Selection */}
                <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      2. Telemetry & Protocols (Smart Defaults)
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {selectedMethods.length} active
                    </span>
                  </div>

                  {/* Multi-Select Pills */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '14px' }}>
                    {AVAILABLE_PROTOCOLS.map((m) => {
                      const isDisabled = getDisabledProtocols(type).includes(m.key as MonitoringMethod);
                      const isChecked = !isDisabled && selectedMethods.includes(m.key as MonitoringMethod);
                      
                      return (
                        <button
                          key={m.key}
                          type="button"
                          disabled={isDisabled}
                          title={isDisabled ? "Not supported for this hardware category." : ""}
                          onClick={() => toggleMethod(m.key as MonitoringMethod)}
                          style={{
                            padding: '8px 4px',
                            background: isDisabled ? 'transparent' : isChecked ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                            border: isDisabled ? '1px dashed #475569' : isChecked ? '1px solid #10b981' : '1px solid #334155',
                            borderRadius: '8px',
                            color: isDisabled ? '#64748b' : isChecked ? '#10b981' : '#94a3b8',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            transition: 'all 0.15s ease',
                            opacity: isDisabled ? 0.6 : 1,
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {m.label} {isDisabled && <span style={{ fontSize: '0.7rem' }}>🚫</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dynamic Configurations Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {selectedMethods.includes('icmp') && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '8px' }}>◈ ICMP Ping</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Probing at {intervalSeconds}s intervals.</div>
                      </div>
                    )}

                    {selectedMethods.includes('snmp') && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                         <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '8px' }}>▤ SNMP Setup</div>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <input type="text" value={communityString} onChange={(e) => setCommunityString(e.target.value)} placeholder="Community" style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.8rem' }} />
                            <select value={snmpVersion} onChange={(e) => setSnmpVersion(e.target.value as 'v2c'|'v3')} style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.8rem' }}><option value="v2c">v2c</option><option value="v3">v3</option></select>
                         </div>
                      </div>
                    )}

                    {selectedMethods.includes('ssh') && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '8px' }}>🔐 SSH Connect</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <input type="text" value={sshUsername} onChange={(e) => setSshUsername(e.target.value)} placeholder="Username (e.g. root)" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                          <input type="password" value={sshPassword} onChange={(e) => setSshPassword(e.target.value)} placeholder="Password (Optional)" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    )}

                    {selectedMethods.includes('wmi') && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '8px' }}>🪟 WMI Setup</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <input type="text" value={wmiUsername} onChange={(e) => setWmiUsername(e.target.value)} placeholder="Username (e.g. Admin)" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                          <input type="password" value={wmiPassword} onChange={(e) => setWmiPassword(e.target.value)} placeholder="Password" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    )}
                    
                    {selectedMethods.includes('http') && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '8px' }}>🌐 HTTP/S Setup</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                          <input type="text" value={httpUrl} onChange={(e) => setHttpUrl(e.target.value)} placeholder="Full URL (e.g. https://google.com)" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    )}

                    {selectedMethods.includes('tcp') && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '8px' }}>🔌 TCP Probe Setup</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                          <input type="number" value={tcpPort} onChange={(e) => setTcpPort(parseInt(e.target.value))} placeholder="TCP Port (e.g. 443, 3306)" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    )}


                    
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1e293b', alignItems: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  style={{ 
                    backgroundColor: 'transparent', 
                    border: 'none', 
                    color: '#94a3b8', 
                    padding: '8px 12px', 
                    borderRadius: '8px',
                    fontSize: '0.85rem', 
                    fontWeight: 600,
                    cursor: 'pointer', 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#f8fafc';
                    e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>←</span> Back
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={handleClose} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '9px 18px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ backgroundColor: '#2563eb', border: 'none', color: '#ffffff', padding: '9px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)' }}>
                    + Add Target
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddDeviceModal;
