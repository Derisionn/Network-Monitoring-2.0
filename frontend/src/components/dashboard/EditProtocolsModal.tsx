import React, { useState, useEffect } from 'react';
import { NetworkDevice, MonitoringMethod, MonitoringConfig } from '../../types/device';
import axios from 'axios';

interface EditProtocolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: NetworkDevice;
  onUpdate: () => void;
}

const AVAILABLE_PROTOCOLS = [
  { key: 'icmp', label: 'ICMP', desc: 'Heartbeat Ping' },
  { key: 'snmp', label: 'SNMP', desc: 'Network Metrics' },
  { key: 'ssh', label: 'SSH', desc: 'OS Level Metrics' },
  { key: 'wmi', label: 'WMI', desc: 'Windows Metrics' },
  { key: 'http', label: 'HTTP/S', desc: 'Web Request' },
  { key: 'tcp', label: 'TCP', desc: 'Port Probe' },
];

export const EditProtocolsModal: React.FC<EditProtocolsModalProps> = ({
  isOpen,
  onClose,
  device,
  onUpdate,
}) => {
  const [selectedMethods, setSelectedMethods] = useState<MonitoringMethod[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (device.monitoring?.methods) {
      setSelectedMethods(device.monitoring.methods);
    } else {
      setSelectedMethods(['icmp']);
    }
  }, [device]);

  if (!isOpen) return null;

  const supported = device.supported_protocols || [];

  const toggleMethod = (method: MonitoringMethod) => {
    // Prevent unchecking the last method
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMethods.length === 0) {
      setError('Please select at least one monitoring protocol.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Fetch current device config, then update just the methods
      const currentConfig = device.monitoring || { intervalSeconds: 30 };
      
      const updatedConfig: MonitoringConfig = {
        ...currentConfig,
        methods: selectedMethods,
      };

      await axios.patch(`/api/v1/metadata/devices/${device.id}`, {
        protocol_config: updatedConfig
      });
      
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to update configuration');
    } finally {
      setIsSubmitting(false);
    }
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Edit Monitoring Protocols</h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Select which discovered protocols should be actively monitored.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {AVAILABLE_PROTOCOLS.map((m) => {
                const isSupported = supported.includes(m.key) || m.key === 'icmp'; // ICMP is always supported
                const isChecked = selectedMethods.includes(m.key as MonitoringMethod);
                
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={!isSupported}
                    title={!isSupported ? "Not discovered on this device during last scan." : ""}
                    onClick={() => toggleMethod(m.key as MonitoringMethod)}
                    style={{
                      padding: '12px',
                      background: !isSupported ? 'transparent' : isChecked ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                      border: !isSupported ? '1px dashed #475569' : isChecked ? '1px solid #10b981' : '1px solid #334155',
                      borderRadius: '8px',
                      color: !isSupported ? '#475569' : isChecked ? '#10b981' : '#cbd5e1',
                      cursor: !isSupported ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                      opacity: !isSupported ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      {m.label} {!isSupported && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>🚫</span>}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: isChecked ? '#059669' : '#64748b' }}>{m.desc}</span>
                  </button>
                );
              })}
            </div>
            
            {supported.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginBottom: '20px', textAlign: 'center' }}>
                ⚠️ No advanced protocols discovered yet. Run a Deep Discovery Scan to find more.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
              <button type="button" onClick={onClose} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '9px 18px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={isSubmitting} type="submit" style={{ backgroundColor: '#2563eb', border: 'none', color: '#ffffff', padding: '9px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProtocolsModal;
