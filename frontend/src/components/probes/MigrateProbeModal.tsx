import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Probe {
  id: string;
  name: string;
  last_heartbeat: string | null;
}

interface MigrateProbeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceProbeId: string;
  onMigrated: () => void;
}

export const MigrateProbeModal: React.FC<MigrateProbeModalProps> = ({
  isOpen,
  onClose,
  sourceProbeId,
  onMigrated,
}) => {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [selectedProbeId, setSelectedProbeId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchOnlineProbes();
      setSelectedProbeId('');
      setError('');
    }
  }, [isOpen]);

  const isProbeOnline = (lastHeartbeat: string | null) => {
    if (!lastHeartbeat) return false;
    const dateStr = lastHeartbeat.endsWith('Z') ? lastHeartbeat : `${lastHeartbeat}Z`;
    const lastTime = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffSeconds = (now - lastTime) / 1000;
    return diffSeconds <= 120; // 2 minutes threshold
  };

  const fetchOnlineProbes = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/v1/metadata/probes');
      // Filter out the source probe itself and any offline/pending probes
      const availableProbes = response.data.filter((p: Probe) => 
        p.id !== sourceProbeId && isProbeOnline(p.last_heartbeat)
      );
      setProbes(availableProbes);
    } catch (error) {
      console.error('Error fetching probes:', error);
      setError('Failed to fetch available probes.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProbeId) {
      setError('Please select a target probe to migrate devices to.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await axios.post(`/api/v1/metadata/probes/${sourceProbeId}/migrate`, {
        target_probe_id: selectedProbeId
      });
      onMigrated();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to migrate devices.');
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
          maxWidth: '450px',
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
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Migrate Devices</h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Transfer active monitoring to another online agent.
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

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                Target Probe (Online Only)
              </label>
              {isLoading ? (
                <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '10px' }}>Loading available agents...</div>
              ) : probes.length === 0 ? (
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                  ⚠️ No other online agents available. You must deploy or start another agent before migrating devices.
                </div>
              ) : (
                <select
                  value={selectedProbeId}
                  onChange={(e) => setSelectedProbeId(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Select an active agent --</option>
                  {probes.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
              <button type="button" onClick={onClose} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '9px 18px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                Cancel
              </button>
              <button 
                disabled={isSubmitting || probes.length === 0 || !selectedProbeId} 
                type="submit" 
                style={{ 
                  backgroundColor: '#3b82f6', border: 'none', color: '#ffffff', 
                  padding: '9px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, 
                  cursor: (isSubmitting || probes.length === 0 || !selectedProbeId) ? 'not-allowed' : 'pointer', 
                  opacity: (isSubmitting || probes.length === 0 || !selectedProbeId) ? 0.5 : 1 
                }}
              >
                {isSubmitting ? 'Migrating...' : 'Migrate Devices'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
