import React, { useState } from 'react';
import axios from 'axios';

interface DeployProbeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProbeCreated: () => void;
}

export const DeployProbeModal: React.FC<DeployProbeModalProps> = ({
  isOpen,
  onClose,
  onProbeCreated
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [probeId, setProbeId] = useState('');
  const [probeName, setProbeName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'linux' | 'windows' | 'manual'>('linux');

  if (!isOpen) return null;

  const handleRegister = async () => {
    try {
      setError('');
      if (!probeId || !probeName) {
        setError('ID and Name are required.');
        return;
      }
      
      await axios.post('/api/v1/metadata/probes', {
        id: probeId,
        name: probeName,
        location: location || null
      });
      
      onProbeCreated();
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register probe.');
    }
  };

  const handleClose = () => {
    setStep(1);
    setProbeId('');
    setProbeName('');
    setLocation('');
    setError('');
    onClose();
  };

  const backendUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  const linuxCmd = `curl -s ${backendUrl}/static/install.sh | bash -s -- --probe-id "${probeId}"`;
  const winCmd = `Invoke-WebRequest -Uri "${backendUrl}/static/install.ps1" -OutFile "install.ps1"; .\\\\install.ps1 -ProbeID "${probeId}"`;
  const manualJson = `{
  "probe_id": "${probeId}",
  "backend_url": "${backendUrl}"
}`;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 100, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: '#0b1120', border: '1px solid #1e293b',
        borderRadius: '12px', width: '600px', maxWidth: '90vw',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px', borderBottom: '1px solid #1e293b',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
            {step === 1 ? 'Register New Probe Agent' : 'Deploy Probe Agent'}
          </h2>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem'
          }}>✕</button>
        </div>

        {/* Body Step 1: Register */}
        {step === 1 && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              Register a new remote agent before deploying it to your infrastructure (Zero Trust).
            </p>
            
            {error && <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}>Probe ID (Unique) *</label>
              <input value={probeId} onChange={e => setProbeId(e.target.value)} placeholder="e.g. london-dc-01" style={{ padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}>Display Name *</label>
              <input value={probeName} onChange={e => setProbeName(e.target.value)} placeholder="e.g. London Data Center" style={{ padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}>Location (Optional)</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Rack 42" style={{ padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button onClick={handleClose} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRegister} style={{ padding: '10px 16px', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Register & Continue</button>
            </div>
          </div>
        )}

        {/* Body Step 2: Deploy */}
        {step === 2 && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '6px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✓</span> Probe registered successfully! Now install it on your target machine.
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', gap: '20px' }}>
              {['linux', 'windows', 'manual'].map((tab) => (
                <div key={tab} onClick={() => setActiveTab(tab as any)} style={{
                  padding: '10px 0', cursor: 'pointer', textTransform: 'capitalize',
                  color: activeTab === tab ? '#38bdf8' : '#64748b',
                  borderBottom: activeTab === tab ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: activeTab === tab ? 600 : 400
                }}>
                  {tab === 'manual' ? 'Manual Setup' : tab}
                </div>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              {activeTab === 'linux' && (
                <div>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 10px 0' }}>Run this single command on your Linux server to automatically deploy and start the agent:</p>
                  <code style={{ display: 'block', backgroundColor: '#000', padding: '12px', borderRadius: '6px', color: '#a78bfa', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    {linuxCmd}
                  </code>
                </div>
              )}
              {activeTab === 'windows' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 6px 0', fontWeight: 600 }}>Step 1: Download & Configure</p>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 10px 0' }}>Run this command in PowerShell (Admin) to configure the agent:</p>
                    <code style={{ display: 'block', backgroundColor: '#000', padding: '12px', borderRadius: '6px', color: '#a78bfa', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                      {winCmd}
                    </code>
                  </div>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 6px 0', fontWeight: 600 }}>Step 2: Start the Agent</p>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 10px 0' }}>Run this command to manually start the agent process:</p>
                    <code style={{ display: 'block', backgroundColor: '#000', padding: '12px', borderRadius: '6px', color: '#38bdf8', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                      python "%USERPROFILE%\NetworkMonitorAgent\agent.py"
                    </code>
                  </div>
                </div>
              )}
              {activeTab === 'manual' && (
                <div>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 10px 0' }}>1. Download the agent zip file and extract it.</p>
                  <button style={{ padding: '6px 12px', backgroundColor: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '16px' }}>⬇ Download Agent</button>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 10px 0' }}>2. Create <code style={{color: '#e2e8f0'}}>probe_config.json</code> with the following contents:</p>
                  <pre style={{ margin: 0, backgroundColor: '#000', padding: '12px', borderRadius: '6px', color: '#38bdf8', fontSize: '0.85rem', overflowX: 'auto' }}>
                    {manualJson}
                  </pre>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '10px 0 0 0' }}>3. Run <code style={{color: '#e2e8f0'}}>python main.py</code></p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button onClick={handleClose} style={{ padding: '10px 24px', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Done</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
