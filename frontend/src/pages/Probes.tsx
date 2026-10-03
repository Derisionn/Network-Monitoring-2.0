import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { DeployProbeModal } from '../components/probes/DeployProbeModal';
import { MigrateProbeModal } from '../components/probes/MigrateProbeModal';

interface Probe {
  id: string;
  name: string;
  location: string | null;
  last_heartbeat: string | null;
}

export const Probes: React.FC = () => {
  const navigate = useNavigate();
  const [probes, setProbes] = useState<Probe[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [migrateModalProbeId, setMigrateModalProbeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProbes = async () => {
    try {
      const response = await axios.get('/api/v1/metadata/probes');
      setProbes(response.data);
    } catch (error) {
      console.error('Error fetching probes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProbes();
    const interval = setInterval(fetchProbes, 15000);
    
    const handleSync = () => fetchProbes();
    window.addEventListener('manual-sync', handleSync);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('manual-sync', handleSync);
    };
  }, []);

  const handleDelete = async (probeId: string) => {
    if (!window.confirm(`Are you sure you want to delete probe ${probeId}?`)) return;
    try {
      await axios.delete(`/api/v1/metadata/probes/${probeId}`);
      fetchProbes();
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('assigned devices')) {
        alert('This agent still has devices assigned to it. Please use the "Migrate" button to move them to another agent first.');
      } else {
        alert(error.response?.data?.detail || 'Failed to delete probe.');
      }
    }
  };

  const getStatus = (lastHeartbeat: string | null) => {
    if (!lastHeartbeat) return { text: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    
    const dateStr = lastHeartbeat.endsWith('Z') ? lastHeartbeat : `${lastHeartbeat}Z`;
    const lastTime = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffSeconds = (now - lastTime) / 1000;
    
    if (diffSeconds > 120) {
      return { text: 'Offline', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    }
    return { text: 'Online', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
            Agent Fleet Management
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Deploy and monitor remote agents across your infrastructure
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            background: '#38bdf8', color: '#0f172a', border: 'none',
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem',
            fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
          }}
        >
          + Register Probe
        </button>
      </div>

      <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Probe Name</th>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Heartbeat</th>
              <th style={{ padding: '14px 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading probes...</td></tr>
            ) : probes.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📡</div>
                <div>No probes registered yet. Click "Register Probe" to deploy your first agent.</div>
              </td></tr>
            ) : probes.map(probe => {
              const status = getStatus(probe.last_heartbeat);
              return (
                <tr key={probe.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '16px 20px', color: '#f8fafc', fontWeight: 600 }}>
                    <span 
                      onClick={() => navigate(`/probes/${probe.id}`)}
                      style={{ cursor: 'pointer', color: '#38bdf8', textDecoration: 'none' }}
                      onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {probe.name}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#94a3b8', fontFamily: 'monospace' }}>{probe.id}</td>
                  <td style={{ padding: '16px 20px', color: '#cbd5e1' }}>{probe.location || '—'}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      backgroundColor: status.bg, color: status.color, 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 
                    }}>
                      {status.text}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem' }}>
                    {probe.last_heartbeat ? new Date(probe.last_heartbeat.endsWith('Z') ? probe.last_heartbeat : `${probe.last_heartbeat}Z`).toLocaleString() : 'Never'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(probe.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setMigrateModalProbeId(probe.id)}
                      style={{
                        background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)',
                        padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s', marginLeft: '8px'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)')}
                    >
                      Migrate
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DeployProbeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onProbeCreated={fetchProbes}
      />
      {migrateModalProbeId && (
        <MigrateProbeModal
          isOpen={!!migrateModalProbeId}
          onClose={() => setMigrateModalProbeId(null)}
          sourceProbeId={migrateModalProbeId}
          onMigrated={fetchProbes}
        />
      )}
    </div>
  );
};
